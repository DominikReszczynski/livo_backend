import mongoose, { Document, Schema } from "mongoose";

export interface IDefect extends Document {
  propertyId: mongoose.Types.ObjectId;     // ID mieszkania, którego dotyczy defekt
  title: string;                           // krótki tytuł defektu
  description: string;                     // szczegółowy opis defektu
  status: string;                          // np. "nowy", "w trakcie", "naprawiony"
  imageFilenames?: string[];               // tablica nazw plików zdjęć
  createdAt?: Date;
  updatedAt?: Date;
}

const defectSchema: Schema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property", // powiązanie z kolekcją properties
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["nowy", "w trakcie", "naprawiony"],
      default: "nowy",
    },
    imageFilenames: [
      {
        type: String,
      },
    ],
  },
  { timestamps: true }
);

const Defect = mongoose.model<IDefect>("Defect", defectSchema, "defects");

export default Defect;