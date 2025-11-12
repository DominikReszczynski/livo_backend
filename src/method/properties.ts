import { Request, Response } from "express";
import Property from "../models/properties";
import mongoose from "mongoose";

// Multer
import multer from "multer";
import path from "path";
import fs from "fs";
import fs2 from "fs/promises";
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

export const uploadSingleImage = multer({ storage }).single("image");

// Bezpiecznie zamień to co masz w DB na ścieżkę na dysku
function toAbsUploadPath(p: any): string | null {
  if (!p) return null;
  if (typeof p !== "string") return null;

  // Jeśli zapisujesz pełne URL-e -> weź tylko ścieżkę
  let rel = p.startsWith("http") ? new URL(p).pathname : p;

  // utnij wiodący "/"
  if (rel.startsWith("/")) rel = rel.slice(1);

  // jeśli nie ma prefiksu "uploads/", dodaj
  if (!rel.startsWith("uploads/")) rel = path.join("uploads", rel);

  return path.join(process.cwd(), rel);
}

async function removeFilesIfExist(paths: any[]) {
  for (const raw of paths) {
    const candidate =
      typeof raw === "string"
        ? raw
        : (raw?.path ?? raw?.url ?? raw?.filename ?? null);

    const abs = toAbsUploadPath(candidate);
    if (!abs) continue;

    try {
      await fs2.unlink(abs);
console.log("Usunięto plik:", abs);
    } catch (e: any) {
      if (e?.code !== "ENOENT") {
        console.warn("⚠️ Nie udało się usunąć pliku:", abs, e?.message);
      }
    }
  }
}

export const propertiesFunctions = {
  
  async addProperty(req: Request, res: Response) {
    console.log("Dodawanie nieruchomości:", JSON.parse(req.body.property), "plik:", req.file?.filename);

    try {
      const propertyData = JSON.parse(req.body.property);
      const imageFilename = req.file?.filename;
console.log("Dodawanie nieruchomości:", propertyData, "plik:", imageFilename);
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
        return;
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
  async setPin(req: Request, res: Response): Promise<void> {
    try {
      const propertyID = req.body.propertyID;
      const pin = req.body.pin;

      if (!propertyID || !pin) {
        res.status(400).send({
          success: false,
          message: "Brakuje danych w żądaniu.",
        });
      }

      const propertyObjectId = new mongoose.Types.ObjectId(propertyID);
      const property = await Property.findById(propertyObjectId);

      if (!property) {
        res.status(404).send({
          success: false,
          message: "Nie znaleziono nieruchomości o podanym ID.",
        });
      } else {
        property.pin = pin;
        await property.save();
      }

      res.status(200).send({ success: true });
    } catch (error) {
      console.error("Błąd podczas pobierania mieszkań właściciela:", error);
      res.status(500).send({
        success: false,
        message: "Wystąpił błąd po stronie serwera.",
      });
    }
  },

  async removePin(req: Request, res: Response): Promise<void> {
    try {
      const propertyID = req.body.propertyID;

      if (!propertyID || !mongoose.isValidObjectId(propertyID)) {
        res.status(400).send({
          success: false,
          message: "Brakuje lub niepoprawne propertyID w żądaniu.",
        });
        return;
      }

      const property = await Property.findById(propertyID);
      if (!property) {
        res.status(404).send({
          success: false,
          message: "Nie znaleziono nieruchomości o podanym ID.",
        });
        return;
      }

      const images = Array.isArray(property.imageFilenames)
        ? property.imageFilenames
        : [];
      const documents = Array.isArray(property.documents)
        ? property.documents
        : [];

      await removeFilesIfExist(images);
      await removeFilesIfExist(documents);

      await Property.updateOne(
        { _id: property._id },
        {
          $unset: { pin: "", tenantId: "" },
          $set: { imageFilenames: [], documents: [] },
        }
      );

      res.status(200).send({ success: true });
    } catch (error) {
      console.error("Błąd podczas usuwania PIN-a:", error);
      res.status(500).send({
        success: false,
        message: "Wystąpił błąd po stronie serwera.",
      });
    }
  },

  // async removePin(req: Request, res: Response): Promise<void> {
  //   try {
  //     const propertyID = req.body.propertyID;

  //     if (!propertyID) {
  //       res.status(400).send({
  //         success: false,
  //         message: "Brakuje propertyID w żądaniu.",
  //       });
  //     }

  //     const propertyObjectId = new mongoose.Types.ObjectId(propertyID);
  //     const property = await Property.findById(propertyObjectId);

  //     if (!property) {
  //       res.status(404).send({
  //         success: false,
  //         message: "Nie znaleziono nieruchomości o podanym ID.",
  //       });
  //     } else {
  //       property.pin = undefined;
  //       await property.save();
  //     }

  //     res.status(200).send({ success: true });
  //   } catch (error) {
  //     console.error("Błąd podczas pobierania mieszkań właściciela:", error);
  //     res.status(500).send({
  //       success: false,
  //       message: "Wystąpił błąd po stronie serwera.",
  //     });
  //   }
  // },

  async addTenantToProperty(req: Request, res: Response): Promise<void> {
  try {
    const { propertyID, tenantID } = req.body;

    // 🔹 Walidacja danych wejściowych
    if (!propertyID || !tenantID) {
      res.status(400).send({
        success: false,
        message: "Brakuje danych w żądaniu.",
      });
      return;
    }

    const propertyObjectId = new mongoose.Types.ObjectId(propertyID);
    const property = await Property.findById(propertyObjectId);

    // 🔹 Sprawdź, czy mieszkanie istnieje
    if (!property) {
      res.status(404).send({
        success: false,
        message: "Nie znaleziono nieruchomości o podanym ID.",
      });
      return;
    }

    // 🔹 Właściciel nie może być swoim własnym najemcą
    if (property.ownerId.toString() === tenantID) {
      res.status(400).send({
        success: false,
        message: "Id właściciela i najemcy są takie same.",
      });
      return;
    }

    // 🔹 Ustaw najemcę
    property.tenantId = new mongoose.Types.ObjectId(tenantID);

    // 🔹 Zmień status na "wynajęte"
    property.status = "wynajęte";

    // 🔹 Zapisz zmiany
    await property.save();

    res.status(200).send({
      success: true,
      message: "Najemca został dodany, status zmieniono na 'wynajęte'.",
      property: property,
    });
  } catch (error) {
    console.error("❌ Błąd podczas dodawania najemcy do nieruchomości:", error);
    res.status(500).send({
      success: false,
      message: "Wystąpił błąd po stronie serwera.",
    });
  }
},

  async getAllPropertiesByTenant(req: Request, res: Response): Promise<void> {
    try {
      const tenantId = req.body.userID;

      if (!tenantId) {
        res.status(400).send({
          success: false,
          message: "Brakuje tenantId w żądaniu.",
        });
      }

      const ownerObjectId = new mongoose.Types.ObjectId(tenantId);
      const properties = await Property.find({ tenantId: ownerObjectId });

      res.status(200).send({ success: true, properties });
    } catch (error) {
      console.error("Błąd podczas pobierania mieszkań właściciela:", error);
      res.status(500).send({
        success: false,
        message: "Wystąpił błąd po stronie serwera.",
      });
    }
  },

  async addRentalImages(req: Request, res: Response): Promise<void> {
  try {
    const { propertyId, propertyID, imageFilenames } = req.body ?? {};
    const id = propertyId ?? propertyID;

    if (!id) {
      res.status(400).send({ success: false, message: "Brakuje propertyId w żądaniu." });
      return;
    }
    if (!Array.isArray(imageFilenames) || imageFilenames.length === 0) {
      res.status(400).send({ success: false, message: "imageFilenames musi być niepustą tablicą." });
      return;
    }
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).send({ success: false, message: "Nieprawidłowe ID nieruchomości." });
      return;
    }

    // normalizacja do samych nazw plików (spójnie z mainImage)
    const normalized: string[] = imageFilenames
      .filter((x: unknown) => typeof x === "string" && (x as string).trim().length > 0)
      .map((x: string) => path.basename(x));

    if (normalized.length === 0) {
      res.status(400).send({ success: false, message: "Brak poprawnych nazw plików." });
      return;
    }

    const property = await Property.findById(id);
    if (!property) {
      res.status(404).send({ success: false, message: "Nie znaleziono nieruchomości o podanym ID." });
      return;
    }

    if (!Array.isArray(property.imageFilenames)) {
      property.imageFilenames = [];
    }

    // idempotentnie (unikamy duplikatów)
    const set = new Set<string>(property.imageFilenames);
    for (const f of normalized) set.add(f);
    property.imageFilenames = [...set];

    await property.save();

    res.status(200).send({
      success: true,
      filenames: property.imageFilenames,
      property,
    });
  } catch (error) {
    console.error("❌ Błąd podczas dodawania zdjęć:", error);
    res.status(500).send({ success: false, message: "Wystąpił błąd po stronie serwera." });
  }
}
};
