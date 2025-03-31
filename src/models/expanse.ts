import mongoose, { Document, Schema } from "mongoose";

export interface IExpanse extends Document {
  name: string;
  description?: string;
  authorId: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  placeOfPurchase?: string;
  category: string;
  createdAt?: Date; 
  updatedAt?: Date;
}

const expanseSchema: Schema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      required: true,
    },
    description: {
      type: String,
      required: false,
    },
    authorId: { type: mongoose.Schema.Types.ObjectId, required: true },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
    },
    placeOfPurchase: {
      type: String,
      required: false,
    },
    category: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Expanse = mongoose.model<IExpanse>("Expanse", expanseSchema, "expanses");
export default Expanse;
