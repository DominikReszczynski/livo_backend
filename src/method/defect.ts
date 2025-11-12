import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import mongoose from "mongoose";
import Defect from "../models/defect";
import Property from "../models/properties";
import { normalizeStatus } from "../utils/status";
import fs from "fs";
import path from "path";
import multer from "multer";

const commentsDir = path.join(process.cwd(), "uploads", "comments");
fs.mkdirSync(commentsDir, { recursive: true });

const commentsStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, commentsDir),
  filename: (_req, file, cb) =>
    cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + path.extname(file.originalname)),
});

export const uploadCommentAttachmentsMiddleware = multer({
  storage: commentsStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
}).array("attachments", 5);

const defectsFunctions = {
  // Dodaj defekt
  async addDefect(req: any, res: any) {
  try {
    const { propertyId, title, description, status, imageFilenames } = req.body;

    const normalized = normalizeStatus(status) ?? 'nowy';
    const newDefect = new Defect({
      propertyId,
      title,
      description,
      status: normalized,
      imageFilenames,
    });

    await newDefect.save();
    return res.status(201).send({ success: true, defect: newDefect });
  } catch (e) {
    console.error("❌ Add defect error:", e);
    return res.status(500).send({ success: false });
  }
},
// Pobierz wszystkie defekty powiązane z użytkownikiem
  async getAllDefects(req: any, res: any) {
    try {
      const { userID } = req.body;
      console.log("➡️ Pobieranie defektów dla usera:", userID);

      // Znajdź mieszkania, w których user jest właścicielem lub najemcą
      const userProperties = await Property.find({
        $or: [{ ownerId: userID }, { tenantId: userID }],
      }).select("_id");

      const propertyIds = userProperties.map((p) => p._id);

      // Pobierz wszystkie defekty związane z tymi mieszkaniami
      const defects = await Defect.find({
        propertyId: { $in: propertyIds },
      }).populate('propertyId', 'name location');

      return res.status(200).send({ success: true, defects });
    } catch (e) {
      console.error("❌ getAllDefects error:", e);
      return res.status(500).send({ success: false });
    }
  },

  // Zmieniamy status defektu
async updateDefectStatus(req: any, res: any) {
  try {
    const { defectId, status } = req.body;
    const normalized = normalizeStatus(status);

    if (!defectId || !normalized) {
      return res.status(400).send({ success: false, message: "Brak danych lub nieprawidłowy status." });
    }

    const updatedDefect = await Defect.findByIdAndUpdate(
      defectId,
      { status: normalized },
      { new: true, runValidators: true }
    );

    if (!updatedDefect) {
      return res.status(404).send({ success: false, message: "Defekt nie znaleziony." });
    }

    return res.status(200).send({ success: true, defect: updatedDefect });
  } catch (e) {
    console.error("❌ Błąd aktualizacji statusu defektu:", e);
    return res.status(500).send({ success: false });
  }
},

async listByUser(req: ExpressRequest, res: ExpressResponse): Promise<void> {
    try {
      const userId = (req.params.userId || req.query.userId || req.body.userId || "").toString();
      if (!mongoose.isValidObjectId(userId)) {
        res.status(400).send({ success: false, message: "Nieprawidłowe userId." });
        return;
      }
      const uid = new mongoose.Types.ObjectId(userId);

      const defects = await Defect.aggregate([
        {
          $lookup: {
            from: "properties",
            localField: "propertyId",
            foreignField: "_id",
            as: "property",
          },
        },
        { $unwind: "$property" },
        {
          $match: {
            $or: [{ "property.ownerId": uid }, { "property.tenantId": uid }],
          },
        },
        {
          $project: {
            _id: 1,
            title: 1,
            description: 1,
            status: 1,
            imageFilenames: 1,
            dueDate: 1,
            createdAt: 1,
            updatedAt: 1,
            propertyId: 1,
            propertyName: "$property.name",
            propertyLocation: "$property.location",
          },
        },
        { $sort: { updatedAt: -1 } },
      ]);

      res.status(200).send({ success: true, defects });
    } catch (e) {
      console.error("❌ listByUser:", e);
      res.status(500).send({ success: false, message: "Błąd serwera." });
    }
  },

  // komentarze i załączniki do defektów

  async listDefectComments(req: any, res: any) {
    try {
      const defectId =
        (req.params?.defectId || req.body?.defectId || req.query?.defectId || "").toString();

      if (!mongoose.isValidObjectId(defectId)) {
        return res
          .status(400)
          .send({ success: false, message: "Nieprawidłowe defectId." });
      }

      const skip = Math.max(0, Number(req.query?.skip ?? 0));
      const limit = Math.min(200, Math.max(1, Number(req.query?.limit ?? 50)));

      const defect = await Defect.findById(defectId)
        .select("comments")
        .populate("comments.author", "username email avatarUrl");

      if (!defect) {
        return res
          .status(404)
          .send({ success: false, message: "Defekt nie znaleziony." });
      }

      const total = defect.comments.length;
      const items = defect.comments.slice(skip, skip + limit);

      return res.status(200).send({ success: true, total, items });
    } catch (e) {
      console.error("❌ listDefectComments:", e);
      return res.status(500).send({ success: false });
    }
  },

  async addDefectComment(req: any, res: any) {
  console.log(req.body);
  try {
    const defectId = (req.params?.defectId || req.body?.defectId || "").toString();
    if (!mongoose.isValidObjectId(defectId)) {
      return res.status(400).send({ success: false, message: "Nieprawidłowe defectId." });
    }

    const { message, userId } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).send({ success: false, message: "Pole 'message' jest wymagane." });
    }

    const files = Array.isArray(req.files)
      ? req.files
      : req.files ? Object.values(req.files).flat() : [];
    const attachments: string[] = files.map((f: any) => `/uploads/comments/${f.filename}`);

    const pushDoc: any = {
      _id: new mongoose.Types.ObjectId(),
      message,
      attachments,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    if (userId && mongoose.isValidObjectId(userId)) {
      pushDoc.author = new mongoose.Types.ObjectId(userId);
    }

    console.log("Dodawanie komentarza do defektu:", defectId, "przez usera:", userId);

    const updated = await Defect.findOneAndUpdate(
      { _id: defectId },
      { $push: { comments: pushDoc } },
      { new: true, projection: { comments: { $slice: -1 } } }
    ).populate("comments.author", "username email avatarUrl");

    if (!updated) {
      return res.status(404).send({ success: false, message: "Defekt nie znaleziony." });
    }

    return res.status(201).send({ success: true, comment: updated.comments[0] });
  } catch (e) {
    console.error("❌ addDefectComment:", e);
    return res.status(500).send({ success: false });
  }
}
};

export default defectsFunctions;