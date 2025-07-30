import mongoose, { Document, Schema, Types } from "mongoose";

export interface IAdvertisement {
  _id: Types.ObjectId;
  id: string; // Virtual property for _id
  producer: Types.ObjectId;
  title: string;
  description: string;
  category?: string;
  subCategory?: string;
  subSubCategory?: string;
  videoUrl?: string;
  coverImage?: string;
  detailImages?: string[];
  documents?: string[];
  tags?: string[];
  isActive: boolean;
  views: number;
  clicks: number;
  createdAt: Date;
  updatedAt: Date;
}

const advertisementSchema = new Schema<IAdvertisement & Document>(
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
    description: {
      type: String,
      required: true,
      maxlength: 2000,
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
    videoUrl: {
      type: String,
      trim: true,
    },
    coverImage: {
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
    views: {
      type: Number,
      default: 0,
    },
    clicks: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Virtual for id
advertisementSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
advertisementSchema.set("toJSON", {
  virtuals: true,
});

export const Advertisement = mongoose.model<IAdvertisement & Document>(
  "Advertisement",
  advertisementSchema
);
