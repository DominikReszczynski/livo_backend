import multer from "multer";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";
import Property from "../models/properties";
import mongoose from "mongoose";

// === USTAWIENIA KATALOGU ===
const uploadDir = "./uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

function makeVersionedName(original: string) {
  const { name, ext } = path.parse(original);

  const base = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  // YYYY-MM-DD_HH-mm-ss
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);

  const rand = crypto.randomBytes(2).toString("hex");
  const safeExt = (ext || "").toLowerCase();

  let fname = `${base}_${stamp}_${rand}${safeExt}`;
  if (fname.length > 200) {
    const cut = 200 - safeExt.length;
    fname = `${base.slice(0, Math.max(0, cut))}${safeExt}`;
  }
  return fname;
}

// === STORAGE: OBRAZY (jak było — UUID) ===
const storageImages = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueName = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `${uniqueName}${extension}`);
  },
});

// === STORAGE: DOKUMENTY (oryginalna nazwa + data/godzina) ===
const storageDocs = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    try {
      cb(null, makeVersionedName(file.originalname));
    } catch (e) {
      cb(e as any, "");
    }
  },
});

// === MULTER INSTANCJE ===
const uploadImages = multer({ storage: storageImages });

const allowedDocMimes = new Set<string>([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const uploadDocs = multer({
  storage: storageDocs,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (allowedDocMimes.has(file.mimetype)) cb(null, true);
    else cb(new Error("Niedozwolony typ pliku. Dozwolone: PDF, DOC, DOCX."));
  },
});

// === HELPER: sprzątanie wrzuconych plików przy błędzie ===
function deleteUploadedFiles(filenames: string[]) {
  filenames.forEach((name) => {
    const fp = path.join(uploadDir, name);
    fs.promises.unlink(fp).catch(() => void 0);
  });
}

// === HANDLERY ===
const fileFunctions = {
  uploadMiddleware: uploadImages.single("image"),

  async handleImageUpload(req: any, res: any) {
    try {
      if (!req.file) {
        return res
          .status(400)
          .send({ success: false, message: "Brak przesłanego pliku." });
      }

      console.log("Plik przesłany:", req.file.filename);
      return res.status(200).send({ success: true, filename: req.file.filename });
    } catch (error) {
      console.error("Błąd podczas przesyłania pliku:", error);
      return res.status(500).send({ success: false, message: "Błąd serwera." });
    }
  },

  // --- wiele obrazów ---
  uploadMultipleMiddleware: uploadImages.array("images", 10),

  async handleMultipleImageUpload(req: any, res: any) {
    try {
      const files: Express.Multer.File[] = (req.files as any) ?? [];
      if (!files.length) {
        return res.status(400).send({
          success: false,
          message: "Nie przesłano żadnych zdjęć.",
        });
      }

      const filenames = files.map((f) => f.filename);
      console.log("Przesłane zdjęcia:", filenames);

      return res.status(200).send({ success: true, filenames });
    } catch (error) {
      console.error("Błąd przy przesyłaniu zdjęć:", error);
      return res.status(500).send({
        success: false,
        message: "Wystąpił błąd serwera.",
      });
    }
  },

  // --- dokumenty ---
  uploadDocumentsMiddleware: uploadDocs.array("documents", 10),

  async handleMultipleDocumentUpload(req: any, res: any) {
    try {
      const files: Express.Multer.File[] = (req.files as any) ?? [];
      if (!files.length) {
        return res
          .status(400)
          .send({ success: false, message: "Nie przesłano żadnych dokumentów." });
      }

      const { propertyId } = req.body;
      const filenames = files.map((f) => f.filename);

      if (!propertyId || !mongoose.Types.ObjectId.isValid(propertyId)) {
        deleteUploadedFiles(filenames);
        return res
          .status(400)
          .send({ success: false, message: "Brak lub niepoprawny propertyId." });
      }

      // dopięcie do nieruchomości, bez duplikatów
      const updated = await Property.findByIdAndUpdate(
        propertyId,
        { $addToSet: { documents: { $each: filenames } } },
        { new: true }
      );

      if (!updated) {
        deleteUploadedFiles(filenames);
        return res
          .status(404)
          .send({ success: false, message: "Nieruchomość nie istnieje." });
      }

      console.log(`Dokumenty dodane do property(${propertyId}):`, filenames);
      return res.status(200).send({
        success: true,
        propertyId,
        filenames,
        documents: updated.documents,
      });
    } catch (error) {
      console.error("Błąd przy przesyłaniu dokumentów:", error);
      if (req?.files?.length) {
        const filenames = (req.files as Express.Multer.File[]).map((f) => f.filename);
        deleteUploadedFiles(filenames);
      }
      return res
        .status(500)
        .send({ success: false, message: "Wystąpił błąd serwera." });
    }
  },
};

module.exports = fileFunctions;