import mongoose, { Schema, Types } from "mongoose";

const materialOfferSchema = new Schema(
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

export const MaterialOffer = mongoose.model(
  "MaterialOffer",
  materialOfferSchema
);
