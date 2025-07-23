import mongoose, { Document, Schema, Types } from "mongoose";

export interface IMaterialRequest extends Document {
  _id: string;
  requester: Types.ObjectId; // Talep eden üretici
  targetProducer: Types.ObjectId; // Hedef üretici (malzemeyi üreten)
  title: string;
  description: string;
  materialName: string;
  quantity: number;
  unit: string;
  specifications: string;
  urgency: string;
  budget: {
    min: number;
    max: number;
    currency: string;
  };
  deliveryLocation: string;
  deliveryDate: Date;
  status: string;
  offers: Types.ObjectId[];
  totalOffers: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const materialRequestSchema = new Schema<IMaterialRequest>(
  {
    requester: {
      type: Schema.Types.ObjectId,
      ref: "Producer",
      required: true,
    },
    targetProducer: {
      type: Schema.Types.ObjectId,
      ref: "Producer",
      required: true,
    },
    title: {
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
    materialName: {
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
      type: String,
      maxlength: 1000,
    },
    urgency: {
      type: String,
      default: "normal",
      enum: ["düşük", "normal", "yüksek", "acil"],
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
    deliveryLocation: {
      type: String,
      required: true,
      trim: true,
    },
    deliveryDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      default: "bekleyen",
      enum: ["bekleyen", "teklifler_alındı", "seçildi", "tamamlandı", "iptal"],
    },
    offers: [
      {
        type: Schema.Types.ObjectId,
        ref: "MaterialOffer",
      },
    ],
    totalOffers: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const MaterialRequest = mongoose.model<IMaterialRequest>(
  "MaterialRequest",
  materialRequestSchema
);
