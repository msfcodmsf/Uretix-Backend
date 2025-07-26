import mongoose, { Document, Schema } from "mongoose";

export interface IInterestCategory {
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

const interestCategorySchema = new Schema<IInterestCategory & Document>(
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
      default: "#3B82F6", // Default blue color
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
interestCategorySchema.index({ name: "text", description: "text" });

// Index for ordering
interestCategorySchema.index({ order: 1, name: 1 });

export const InterestCategory = mongoose.model<IInterestCategory & Document>(
  "InterestCategory",
  interestCategorySchema
);
