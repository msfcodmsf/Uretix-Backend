import mongoose, { Document, Schema, Types } from "mongoose";

export interface IProduct {
  _id: string;
  id: string; // Virtual property for _id
  producer: Types.ObjectId;
  name: string;
  shortDescription: string;
  description: string;
  category: string;
  subCategory: string;
  price: number;
  originalPrice?: number;
  currency: string;

  inStock?: boolean;
  maximumOrderQuantity?: number;
  availableQuantity: number;
  coverImage: string; // Ürün ilan kapağı
  images: string[]; // Detay fotoğrafları (max 5)
  videoUrl?: string; // Ürün videosu
  materialType: string; // Malzeme tipi
  productVariants: Array<{
    size?: string;
    color?: string;
    stock: number;
    price: number;
  }>;
  usageAreas: string[]; // Kullanım alanları
  dimensions: {
    height: number;
    width: number;
    depth: number;
  };
  weight: number;
  weightUnit: string;
  estimatedDeliveryTime: string;
  shippingMethod: string;
  nonDeliveryRegions: string[];
  discounts: Array<{
    quantityRange: string;
    discountPercentage: number;
  }>;
  specifications?: Record<string, any>;
  tags: string[];
  isActive: boolean;
  isFeatured: boolean;
  rating: number;
  totalRatings: number;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct & Document>(
  {
    producer: {
      type: Schema.Types.ObjectId,
      ref: "Producer",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    shortDescription: {
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
    category: {
      type: String,
      required: true,
      trim: true,
    },
    subCategory: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    originalPrice: {
      type: Number,
      min: 0,
    },
    currency: {
      type: String,
      default: "TL",
      enum: ["TL", "USD", "EUR"],
    },

    inStock: {
      type: Boolean,
      default: true,
    },
    maximumOrderQuantity: {
      type: Number,
      min: 1,
    },
    availableQuantity: {
      type: Number,
      required: true,
      min: 0,
    },
    coverImage: {
      type: String,
      required: false,
      trim: true,
      default: "https://via.placeholder.com/400x300?text=No+Image",
    },
    images: {
      type: [String],
      trim: true,
      validate: {
        validator: function (v: string[]) {
          return v.length <= 5; // Maksimum 5 detay fotoğrafı
        },
        message: "Detay fotoğrafları maksimum 5 adet olabilir",
      },
    },
    videoUrl: {
      type: String,
      trim: true,
    },
    materialType: {
      type: String,
      required: true,
      trim: true,
    },
    productVariants: [
      {
        size: {
          type: String,
          trim: true,
        },
        color: {
          type: String,
          trim: true,
        },
        stock: {
          type: Number,
          required: true,
          min: 0,
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],
    usageAreas: [
      {
        type: String,
        trim: true,
      },
    ],
    dimensions: {
      height: {
        type: Number,
        required: true,
        min: 0,
      },
      width: {
        type: Number,
        required: true,
        min: 0,
      },
      depth: {
        type: Number,
        required: true,
        min: 0,
      },
    },
    weight: {
      type: Number,
      required: true,
      min: 0,
    },
    weightUnit: {
      type: String,
      default: "kg",
      enum: ["kg", "g", "lb", "oz"],
    },
    estimatedDeliveryTime: {
      type: String,
      required: true,
      trim: true,
    },
    shippingMethod: {
      type: String,
      required: true,
      trim: true,
    },
    nonDeliveryRegions: [
      {
        type: String,
        trim: true,
      },
    ],
    discounts: [
      {
        quantityRange: {
          type: String,
          required: true,
          trim: true,
        },
        discountPercentage: {
          type: Number,
          required: true,
          min: 0,
          max: 100,
        },
      },
    ],
    specifications: {
      type: Schema.Types.Mixed,
      default: {},
    },
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
    isFeatured: {
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
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for search
productSchema.index({
  name: "text",
  description: "text",
  category: "text",
  subCategory: "text",
  tags: "text",
});

export const Product = mongoose.model<IProduct & Document>(
  "Product",
  productSchema
);
