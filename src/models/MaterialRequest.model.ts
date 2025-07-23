import mongoose, { Document, Schema, Types } from "mongoose";

export interface IMaterialRequest {
  _id: string;
  id: string; // Virtual property for _id
  requester: Types.ObjectId;
  title: string;
  description: string;
  category: string;
  subCategory: string;
  quantity: number;
  unit: string;
  specifications: Record<string, any>;
  deliveryLocation: string;
  deliveryDate: Date;
  budget: {
    min: number;
    max: number;
    currency: string;
  };
  isUrgent: boolean;
  status: string;
  offers: Types.ObjectId[];
  selectedOffer?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const materialRequestSchema = new Schema<IMaterialRequest & Document>(
  {
    requester: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
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
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    unit: {
      type: String,
      required: true,
      trim: true,
    },
    specifications: {
      type: Schema.Types.Mixed,
      default: {},
    },
    deliveryLocation: {
      type: String,
      required: true,
      trim: true,
    },
    deliveryDate: {
      type: Date,
      required: true,
    },
    budget: {
      min: {
        type: Number,
        required: true,
        min: 0,
      },
      max: {
        type: Number,
        required: true,
        min: 0,
      },
      currency: {
        type: String,
        default: "TL",
        enum: ["TL", "USD", "EUR"],
      },
    },
    isUrgent: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      default: "açık",
      enum: ["açık", "teklifler alınıyor", "seçildi", "tamamlandı", "iptal"],
    },
    offers: [
      {
        type: Schema.Types.ObjectId,
        ref: "MaterialOffer",
      },
    ],
    selectedOffer: {
      type: Schema.Types.ObjectId,
      ref: "MaterialOffer",
    },
  },
  {
    timestamps: true,
  }
);

export const MaterialRequest = mongoose.model<IMaterialRequest & Document>(
  "MaterialRequest",
  materialRequestSchema
);
