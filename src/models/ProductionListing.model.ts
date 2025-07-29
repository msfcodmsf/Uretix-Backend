import mongoose, { Document, Schema, Types } from "mongoose";

export interface IProductionListing {
  _id: Types.ObjectId;
  id: string; // Virtual property for _id
  producer: Types.ObjectId;
  title: string;
  description: string;
  category?: string;
  subCategory?: string;
  subSubCategory?: string;
  location: string;
  type: string;
  salary: {
    min: number;
    max: number;
    currency: string;
  };
  benefits: string[];
  coverImage?: string;
  videoUrl?: string;
  detailImages?: string[];
  documents?: string[];
  technicalDetails?: string;
  productionTime?: string;
  deliveryTime?: string;
  logisticsModel?: string;
  productionLocation?: string;
  isActive: boolean;
  applications: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const productionListingSchema = new Schema<IProductionListing & Document>(
  {
    producer: {
      type: Schema.Types.ObjectId,
      ref: "Producer",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    category: {
      type: String,
      trim: true,
    },
    subCategory: {
      type: String,
      trim: true,
    },
    subSubCategory: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["tam zamanlı", "yarı zamanlı", "uzaktan", "staj", "üretim"],
    },
    salary: {
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
    benefits: [
      {
        type: String,
        trim: true,
      },
    ],
    coverImage: {
      type: String,
      trim: true,
    },
    videoUrl: {
      type: String,
      trim: true,
    },
    detailImages: [
      {
        type: String,
        trim: true,
      },
    ],
    documents: [
      {
        type: String,
        trim: true,
      },
    ],
    technicalDetails: {
      type: String,
      trim: true,
      maxlength: 800,
    },
    productionTime: {
      type: String,
      trim: true,
    },
    deliveryTime: {
      type: String,
      trim: true,
    },
    logisticsModel: {
      type: String,
      trim: true,
    },
    productionLocation: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    applications: [
      {
        type: Schema.Types.ObjectId,
        ref: "JobApplication",
      },
    ],
  },
  { timestamps: true }
);

// Virtual for id
productionListingSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
productionListingSchema.set("toJSON", {
  virtuals: true,
});

export const ProductionListing = mongoose.model<IProductionListing & Document>(
  "ProductionListing",
  productionListingSchema
);
