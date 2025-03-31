import multer from "multer";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

// Folder docelowy
const uploadDir = "./uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Konfiguracja przechowywania
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    const uniqueName = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `${uniqueName}${extension}`);
  },
});

const upload = multer({ storage: storage });

const imageFunctions = {
  uploadMultipleMiddleware: upload.array("images", 10), // max 10 zdjęć

  async handleMultipleImageUpload(req: any, res: any) {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).send({
          success: false,
          message: "Nie przesłano żadnych zdjęć.",
        });
      }

      const filenames = req.files.map(
        (file: Express.Multer.File) => file.filename
      );
      console.log("Przesłane pliki:", filenames);

      return res.status(200).send({ success: true, filenames });
    } catch (error) {
      console.error("Błąd przy przesyłaniu zdjęć:", error);
      return res.status(500).send({
        success: false,
        message: "Wystąpił błąd serwera.",
      });
    }
  },
};

module.exports = imageFunctions;
