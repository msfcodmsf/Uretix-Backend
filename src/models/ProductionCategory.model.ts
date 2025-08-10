import mongoose, { Schema, Document } from "mongoose";

export interface IProductionCategory extends Document {
  name: string;
  description?: string;
  type: "surface_treatment" | "laser_logo" | "other" | "vitrin";
  vitrinCategory?: "uretim" | "hizmet" | "urun";
  parentCategory?: string;
  productType?: "bitmis_urun" | "yari_mamul"; // Bitmiş Ürünler veya Yarı Mamül Ürünler
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productionCategorySchema = new Schema<IProductionCategory>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["surface_treatment", "laser_logo", "other", "vitrin"],
      default: "other",
    },
    vitrinCategory: {
      type: String,
      enum: ["uretim", "hizmet", "urun"],
    },
    parentCategory: {
      type: Schema.Types.ObjectId,
      ref: "ProductionCategory",
    },
    productType: {
      type: String,
      enum: ["bitmis_urun", "yari_mamul"],
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

// Index for better query performance
productionCategorySchema.index({ type: 1, isActive: 1 });

export default mongoose.model<IProductionCategory>(
  "ProductionCategory",
  productionCategorySchema
);
