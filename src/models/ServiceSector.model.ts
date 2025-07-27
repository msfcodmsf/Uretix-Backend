import mongoose, { Document, Schema } from "mongoose";

export interface IServiceSector {
  _id: string;
  id: string; // Virtual property for _id
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const serviceSectorSchema = new Schema<IServiceSector & Document>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    icon: {
      type: String,
      trim: true,
      maxlength: 50,
    },
    color: {
      type: String,
      trim: true,
      maxlength: 7, // Hex color code
      default: "#10B981", // Default green color
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
  { timestamps: true }
);

// Index for search
serviceSectorSchema.index({ name: "text", description: "text" });

// Index for ordering
serviceSectorSchema.index({ order: 1, name: 1 });

export const ServiceSector = mongoose.model<IServiceSector & Document>(
  "ServiceSector",
  serviceSectorSchema
);
