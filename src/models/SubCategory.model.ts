import mongoose, { Document, Schema, Types } from "mongoose";

export interface ISubCategory {
  _id: string;
  id: string; // Virtual property for _id
  name: string;
  slug: string;
  description?: string;
  parentCategory: Types.ObjectId;
  isActive: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const subCategorySchema = new Schema<ISubCategory & Document>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    parentCategory: {
      type: Schema.Types.ObjectId,
      ref: "ProductionCategory",
      required: true,
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
subCategorySchema.pre("save", function (next) {
  if (this.isModified("name")) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }
  next();
});

// Compound unique index for name and parentCategory
subCategorySchema.index({ name: 1, parentCategory: 1 }, { unique: true });

export const SubCategory = mongoose.model<ISubCategory & Document>(
  "SubCategory",
  subCategorySchema
);
