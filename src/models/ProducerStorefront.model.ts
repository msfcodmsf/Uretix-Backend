import mongoose, { Document, Schema, Types } from "mongoose";

export interface IProducerStorefront {
  _id: string;
  id: string; // Virtual property for _id
  producer: Types.ObjectId;
  companyName: string;
  companyDescription: string;
  companyVideo?: string;
  companyLogo?: string;
  companyImages?: string[];
  taxOffice: string;
  taxNumber: string;
  city: string;
  district: string;
  address: string;
  mainProductionCategory: string;
  subProductionCategories: string[];
  serviceTags: string[];
  interestTags: string[];
  deliveryRegions: string[];
  estimatedDeliveryTime: string;
  shippingManagement: string;
  shippingMethod: string;
  nonDeliveryRegions: string[];
  customPartProduction: string;
  customProduction: boolean;
  averageProductionTime: string;
  sampleDeliveryRequest: string;
  sampleDelivery: boolean;
  offerArea: string;
  isActive: boolean;
  isVerified: boolean;
  rating: number;
  totalRatings: number;
  followers: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const producerStorefrontSchema = new Schema<IProducerStorefront & Document>(
  {
    producer: {
      type: Schema.Types.ObjectId,
      ref: "Producer",
      required: true,
      unique: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    companyDescription: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    companyVideo: {
      type: String,
      trim: true,
    },
    companyLogo: {
      type: String,
      trim: true,
    },
    companyImages: [
      {
        type: String,
        trim: true,
      },
    ],
    taxOffice: {
      type: String,
      required: true,
      trim: true,
    },
    taxNumber: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    district: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    mainProductionCategory: {
      type: String,
      required: true,
      trim: true,
    },
    subProductionCategories: [
      {
        type: String,
        trim: true,
      },
    ],
    serviceTags: [
      {
        type: String,
        trim: true,
      },
    ],
    interestTags: [
      {
        type: String,
        trim: true,
      },
    ],
    deliveryRegions: [
      {
        type: String,
        trim: true,
      },
    ],
    estimatedDeliveryTime: {
      type: String,
      trim: true,
    },
    shippingManagement: {
      type: String,
      trim: true,
    },
    shippingMethod: {
      type: String,
      trim: true,
    },
    nonDeliveryRegions: [
      {
        type: String,
        trim: true,
      },
    ],
    customPartProduction: {
      type: String,
      trim: true,
    },
    customProduction: {
      type: Boolean,
      default: false,
    },
    averageProductionTime: {
      type: String,
      trim: true,
    },
    sampleDeliveryRequest: {
      type: String,
      trim: true,
    },
    sampleDelivery: {
      type: Boolean,
      default: false,
    },
    offerArea: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
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
    followers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const ProducerStorefront = mongoose.model<
  IProducerStorefront & Document
>("ProducerStorefront", producerStorefrontSchema);
