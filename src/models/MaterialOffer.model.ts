import mongoose, { Document, Schema, Types } from "mongoose";

export interface IMaterialOffer extends Document {
  _id: string;
  materialRequest: Types.ObjectId;
  offerer: Types.ObjectId; // Teklif veren üretici
  price: number;
  currency: string;
  deliveryTime: string;
  deliveryLocation: string;
  description: string;
  specifications: string;
  status: string;
  isSelected: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const materialOfferSchema = new Schema<IMaterialOffer>(
  {
    materialRequest: {
      type: Schema.Types.ObjectId,
      ref: "MaterialRequest",
      required: true,
    },
    offerer: {
      type: Schema.Types.ObjectId,
      ref: "Producer",
      required: true,
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
    deliveryTime: {
      type: String,
      required: true,
      trim: true,
    },
    deliveryLocation: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    specifications: {
      type: String,
      maxlength: 500,
    },
    status: {
      type: String,
      default: "bekleyen",
      enum: ["bekleyen", "kabul", "red", "iptal"],
    },
    isSelected: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const MaterialOffer = mongoose.model<IMaterialOffer>(
  "MaterialOffer",
  materialOfferSchema
);
