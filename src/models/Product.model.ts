import mongoose, { Document, Schema, Types } from "mongoose";

export interface IProduct extends Document {
  _id: string;
  producer: Types.ObjectId;
  name: string;
  description: string;
  images: string[];
  price: number;
  currency: string;
  category: string;
  subCategory: string;
  tags: string[];
  minOrderQuantity: number;
  stockQuantity: number;
  productionLocation: string;
  paymentType: string;
  colors: string[];
  variants: {
    name: string;
    value: string;
    price?: number;
  }[];
  isActive: boolean;
  isFeatured: boolean;
  rating: number;
  totalRatings: number;
  totalOrders: number;
  totalFavorites: number;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
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
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    images: [
      {
        type: String,
        trim: true,
      },
    ],
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
    category: {
      type: String,
      required: true,
      trim: true,
    },
    subCategory: {
      type: String,
      trim: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    minOrderQuantity: {
      type: Number,
      required: true,
      min: 1,
    },
    stockQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    productionLocation: {
      type: String,
      required: true,
      trim: true,
    },
    paymentType: {
      type: String,
      trim: true,
    },
    colors: [
      {
        type: String,
        trim: true,
      },
    ],
    variants: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        value: {
          type: String,
          required: true,
          trim: true,
        },
        price: {
          type: Number,
          min: 0,
        },
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
    },
    totalOrders: {
      type: Number,
      default: 0,
    },
    totalFavorites: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const Product = mongoose.model<IProduct>("Product", productSchema);
