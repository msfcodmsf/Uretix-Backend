import mongoose, { Document, Schema } from "mongoose";

export interface IProductionMethod extends Document {
  name: string;
  description?: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductionMethodSchema = new Schema<IProductionMethod>(
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

export const ProductionMethod = mongoose.model<IProductionMethod>(
  "ProductionMethod",
  ProductionMethodSchema
);
