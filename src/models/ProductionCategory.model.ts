import mongoose, { Document, Schema } from "mongoose";

export interface IProductionCategory {
  _id: string;
  id: string; // Virtual property for _id
  name: string;
  type: "vitrin" | "hizmet" | "ilgi" | "diger";
  vitrinCategory?: "uretim" | "kargo" | "ilgi";
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
      enum: ["uretim", "kargo", "ilgi"],
      required: function () {
        return this.type === "vitrin";
      },
    },
    parentCategory: {
      type: String,
      ref: "ProductionCategory",
      required: function () {
        // Sadece vitrinCategory "uretim" olan ve parentCategory değeri olan kategoriler için zorunlu
        return (
          this.type === "vitrin" &&
          this.vitrinCategory === "uretim" &&
          this.parentCategory
        );
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
