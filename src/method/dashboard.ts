import mongoose from "mongoose";
import multer from "multer";
import fs from "fs";
import path from "path";

const uploadDir = "./uploads";

// Utwórz folder, jeśli nie istnieje
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });
const dasboardFunctions = {
  uploadMiddleware: upload.single("image"),

  async handleImageUpload(req: any, res: any) {
    try {
      if (!req.file) {
        return res
          .status(400)
          .send({ success: false, message: "Brak przesłanego pliku." });
      }

      console.log("Plik przesłany:", req.file.filename);

      return res
        .status(200)
        .send({ success: true, filename: req.file.filename });
    } catch (error) {
      console.error("Błąd podczas przesyłania pliku:", error);
      return res.status(500).send({ success: false, message: "Błąd serwera." });
    }
  },
};

module.exports = dasboardFunctions;
