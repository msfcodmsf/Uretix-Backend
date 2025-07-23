import mongoose, { Document, Schema, Types } from "mongoose";

export interface IProduct {
  _id: string;
  id: string; // Virtual property for _id
  producer: Types.ObjectId;
  name: string;
  description: string;
  category: string;
  subCategory: string;
  price: number;
  currency: string;
  unit: string;
  minimumOrderQuantity: number;
  maximumOrderQuantity?: number;
  availableQuantity: number;
  images: string[];
  specifications: Record<string, any>;
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  rating: number;
  totalRatings: number;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct & Document>(
  {
    producer: {
      type: Schema.Types.ObjectId,
      ref: "Producer",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    subCategory: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "TL",
      enum: ["TL", "USD", "EUR"],
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    minimumOrderQuantity: {
      type: Number,
      required: true,
      min: 1,
    },
    maximumOrderQuantity: {
      type: Number,
      min: 1,
    },
    availableQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    specifications: {
      type: Schema.Types.Mixed,
      default: {},
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalRatings: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for search
productSchema.index({
  name: "text",
  description: "text",
  category: "text",
  subCategory: "text",
  tags: "text",
});

export const Product = mongoose.model<IProduct & Document>(
  "Product",
  productSchema
);
