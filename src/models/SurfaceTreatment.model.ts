import mongoose, { Schema, Document } from "mongoose";

export interface ISurfaceTreatment extends Document {
  name: string;
  description?: string;
  isActive: boolean;
  order?: number;
  createdAt: Date;
  updatedAt: Date;
}

const surfaceTreatmentSchema = new Schema<ISurfaceTreatment>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
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

// Index for better query performance
surfaceTreatmentSchema.index({ isActive: 1, order: 1 });

export default mongoose.model<ISurfaceTreatment>(
  "SurfaceTreatment",
  surfaceTreatmentSchema
);
