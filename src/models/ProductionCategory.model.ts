import mongoose, { Document, Schema } from "mongoose";

export interface IProductionCategory {
  _id: string;
  id: string; // Virtual property for _id
  name: string;
  type: "vitrin" | "hizmet" | "ilgi" | "diger";
  vitrinCategory?: "uretim" | "kargo";
  parentCategory?: string; // Ana kategori ID'si (alt kategoriler için)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productionCategorySchema = new Schema<IProductionCategory & Document>(
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
      enum: ["vitrin", "hizmet", "ilgi", "diger"],
      default: "vitrin",
    },
    vitrinCategory: {
      type: String,
      enum: ["uretim", "kargo"],
      required: function () {
        return this.type === "vitrin";
      },
    },
    parentCategory: {
      type: String,
      ref: "ProductionCategory",
      required: function () {
        return this.type === "hizmet"; // Hizmet kategorileri için parent gerekli
      },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Compound unique index for name and type
productionCategorySchema.index({ name: 1, type: 1 }, { unique: true });

export const ProductionCategory = mongoose.model<
  IProductionCategory & Document
>("ProductionCategory", productionCategorySchema);
