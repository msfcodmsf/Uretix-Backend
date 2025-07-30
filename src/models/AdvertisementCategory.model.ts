import mongoose, { Document, Schema, Types } from "mongoose";

export interface IAdvertisementCategory {
  _id: Types.ObjectId;
  id: string; // Virtual property for _id
  name: string;
  type: "reklam";
  parentCategory?: Types.ObjectId; // Ana kategori ID'si (alt kategoriler için)
  description?: string;
  color?: string;
  order?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const advertisementCategorySchema = new Schema<
  IAdvertisementCategory & Document
>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    type: {
      type: String,
      required: true,
      enum: ["reklam"],
      default: "reklam",
    },
    parentCategory: {
      type: Schema.Types.ObjectId,
      ref: "AdvertisementCategory",
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    color: {
      type: String,
      trim: true,
      maxlength: 7, // Hex color code
    },
    order: {
      type: Number,
      default: 0,
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Compound unique index for name and type
advertisementCategorySchema.index({ name: 1, type: 1 }, { unique: true });

// Virtual for id
advertisementCategorySchema.virtual("id").get(function () {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
advertisementCategorySchema.set("toJSON", {
  virtuals: true,
});

export const AdvertisementCategory = mongoose.model<
  IAdvertisementCategory & Document
>("AdvertisementCategory", advertisementCategorySchema);
