import mongoose, { Document, Schema } from "mongoose";

export interface IRawMaterial extends Document {
  name: string;
  description?: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const RawMaterialSchema = new Schema<IRawMaterial>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const RawMaterial = mongoose.model<IRawMaterial>(
  "RawMaterial",
  RawMaterialSchema
);
