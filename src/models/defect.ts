// src/models/defect.ts
import mongoose, { Document, Schema, Types } from "mongoose";

export interface IComment {
  _id: Types.ObjectId;
  message: string;
  author: Types.ObjectId;
  attachments: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IDefect extends Document {
  propertyId: mongoose.Types.ObjectId;
  title: string;
  description: string;
  status: "nowy" | "w trakcie" | "naprawiony";
  imageFilenames?: string[];
  comments: IComment[];
  createdAt?: Date;
  updatedAt?: Date;
}

const commentSchema = new Schema<IComment>(
  {
    message: { type: String, required: true, trim: true },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    attachments: [{ type: String }],
  },
  { _id: true, timestamps: true }
);

const defectSchema: Schema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ["nowy", "w trakcie", "naprawiony"],
      default: "nowy",
    },
    imageFilenames: [{ type: String }],
    comments: { type: [commentSchema], default: [] },
  },
  { timestamps: true }
);

defectSchema.index({ "comments.createdAt": -1 });

const Defect = mongoose.model<IDefect>("Defect", defectSchema, "defects");
export default Defect;