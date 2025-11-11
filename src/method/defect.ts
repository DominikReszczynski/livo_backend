import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import mongoose from "mongoose";
import Defect from "../models/defect";
import Property from "../models/properties";
import { normalizeStatus } from "../utils/status";

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
      { new: true, runValidators: true } // ważne dla enum
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

};

export default defectsFunctions;