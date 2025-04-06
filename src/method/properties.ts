import { Request, Response } from "express";
import Property from "../models/properties";
import mongoose from "mongoose";

// Multer
import multer from "multer";
import path from "path";
import fs from "fs";

// Konfiguracja uploadu
const uploadDir = "./uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

export const uploadSingle = multer({ storage }).single("image");

export const propertiesFunctions = {
  async addProperty(req: Request, res: Response) {
    try {
      const propertyData = JSON.parse(req.body.property);
      const imageFilename = req.file?.filename;

      if (imageFilename) {
        propertyData.mainImage = imageFilename;
      }

      propertyData.ownerId = new mongoose.Types.ObjectId(propertyData.ownerId);

      const newProperty = new Property(propertyData);
      await newProperty.save();

      res.status(200).send({ success: true, property: newProperty });
    } catch (error) {
      console.error("Błąd podczas dodawania nieruchomości:", error);
      res.status(500).send({ success: false, message: "Błąd serwera" });
    }
  },

  async getAllPropertiesByOwner(req: Request, res: Response): Promise<void> {
    try {
      // console.log("Pobieranie mieszkań właściciela");
      console.log("req.body", req.body);
      console.log("req.body.userID", req.body.userID);
      const ownerId = req.body.userID;

      if (!ownerId) {
        res.status(400).send({
          success: false,
          message: "Brakuje ownerId w żądaniu.",
        });
      }

      const ownerObjectId = new mongoose.Types.ObjectId(ownerId);
      const properties = await Property.find({ ownerId: ownerObjectId });

      res.status(200).send({ success: true, properties });
    } catch (error) {
      console.error("Błąd podczas pobierania mieszkań właściciela:", error);
      res.status(500).send({
        success: false,
        message: "Wystąpił błąd po stronie serwera.",
      });
    }
  },
};
