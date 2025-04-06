import mongoose, { Document, Schema } from "mongoose";

export interface IProperty extends Document {
  ownerId: mongoose.Types.ObjectId;
  name: string;
  location: string;
  size: number;
  rooms: number;
  floor: number;
  features?: string[];
  status: string;
  tenantId?: mongoose.Types.ObjectId;
  rentAmount: number;
  depositAmount: number;
  paymentCycle: string;
  rentalStart?: Date;
  rentalEnd?: Date;
  imageFilenames?: string[];
  rentalContractFilename?: string;
  notes?: string;
  mainImage?: string;
  pin?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const propertySchema: Schema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    location: { type: String, required: true },
    size: { type: Number, required: true },
    rooms: { type: Number, required: true },
    floor: { type: Number, required: true },
    features: [{ type: String }],
    status: { type: String, required: true },
    tenantId: { type: mongoose.Schema.Types.ObjectId, required: false },
    rentAmount: { type: Number, required: true },
    depositAmount: { type: Number, required: true },
    paymentCycle: { type: String, required: true },
    rentalStart: { type: Date },
    rentalEnd: { type: Date },
    imageFilenames: [{ type: String }],
    rentalContractFilename: { type: String },
    notes: { type: String },
    mainImage: {
      type: String,
      required: false,
    },
    pin: { type: String, required: false },
  },
  { timestamps: true }
);

const Property = mongoose.model<IProperty>(
  "Property",
  propertySchema,
  "properties"
);
export default Property;
