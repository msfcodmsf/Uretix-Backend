import mongoose, { Document, Schema } from "mongoose";

export interface ITaxOffice {
  _id: string;
  id: string; // Virtual property for _id
  name: string;
  slug: string;
  city: string;
  district?: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const taxOfficeSchema = new Schema<ITaxOffice & Document>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    district: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Create slug from name before saving
taxOfficeSchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }
  next();
});

export const TaxOffice = mongoose.model<ITaxOffice & Document>(
  "TaxOffice",
  taxOfficeSchema
);
