import mongoose, { Document, Schema, Types } from "mongoose";

export interface IProduct {
  _id: string;
  id: string; // Virtual property for _id
  producer: Types.ObjectId;
  name: string;
  shortDescription: string;
  description: string;
  subSubCategory: string;
  productCategory: string;
  productType: "yarim-mamul" | "bitmis-urun"; // Yarı mamül veya bitmiş ürün
  inStock?: boolean;
  maximumOrderQuantity?: number;
  availableQuantity: number;
  coverImage: string; // Ürün ilan kapağı
  images: string[]; // Detay fotoğrafları (max 5)
  videoUrl?: string; // Ürün videosu
  materialType: string; // Malzeme tipi
  productVariants: Array<{
    _id?: string;
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

  // Otomatik pasif hale getirme sistemi
  lastActivatedAt?: Date; // Son aktif edilme tarihi
  autoDeactivateAt?: Date; // Otomatik pasif hale gelecek tarih
  autoDeactivateEnabled: boolean; // Otomatik pasif hale getirme aktif mi

  // Kullanıcı etkileşimleri
  likes: Array<{
    user: Types.ObjectId;
    createdAt: Date;
  }>;
  comments: Array<{
    user: Types.ObjectId;
    comment: string;
    rating?: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
  orders: Array<{
    user: Types.ObjectId;
    orderId: string;
    quantity: number;
    totalPrice: number;
    status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
    createdAt: Date;
    updatedAt: Date;
  }>;

  // İstatistikler
  totalLikes: number;
  totalComments: number;
  totalOrders: number;
  totalRevenue: number;

  // Bildirim ayarları
  notificationSettings: {
    autoDeactivateReminder: boolean; // 14 gün öncesi uyarı
    newOrderNotification: boolean;
    newCommentNotification: boolean;
    newLikeNotification: boolean;
  };

  // Methods
  addLike(userId: Types.ObjectId): Promise<IProduct>;
  removeLike(userId: Types.ObjectId): Promise<IProduct>;
  addComment(
    userId: Types.ObjectId,
    comment: string,
    rating?: number
  ): Promise<IProduct>;
  addOrder(
    userId: Types.ObjectId,
    orderId: string,
    quantity: number,
    totalPrice: number
  ): Promise<IProduct>;
  activateProduct(): Promise<IProduct>;

  createdAt: Date;
  updatedAt: Date;
}

// Static methods interface
export interface IProductModel extends mongoose.Model<IProduct & Document> {
  findProductsForAutoDeactivation(): Promise<IProduct[]>;
  findProductsForReminder(): Promise<IProduct[]>;
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
    subSubCategory: {
      type: String,
      required: true,
      trim: true,
    },
    productCategory: {
      type: String,
      required: true,
      trim: true,
    },
    productType: {
      type: String,
      required: true,
      enum: ["yarim-mamul", "bitmis-urun"],
      default: "bitmis-urun",
    },

    inStock: {
      type: Boolean,
      default: true,
    },
    maximumOrderQuantity: {
      type: Number,
      min: 0,
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

    // Otomatik pasif hale getirme sistemi
    lastActivatedAt: {
      type: Date,
      default: Date.now,
    },
    autoDeactivateAt: {
      type: Date,
    },
    autoDeactivateEnabled: {
      type: Boolean,
      default: true,
    },

    // Kullanıcı etkileşimleri
    likes: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    comments: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        comment: {
          type: String,
          required: true,
          trim: true,
          maxlength: 1000,
        },
        rating: {
          type: Number,
          min: 1,
          max: 5,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    orders: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        orderId: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        totalPrice: {
          type: Number,
          required: true,
          min: 0,
        },
        status: {
          type: String,
          enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
          default: "pending",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // İstatistikler
    totalLikes: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalComments: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalOrders: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalRevenue: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Bildirim ayarları
    notificationSettings: {
      autoDeactivateReminder: {
        type: Boolean,
        default: true,
      },
      newOrderNotification: {
        type: Boolean,
        default: true,
      },
      newCommentNotification: {
        type: Boolean,
        default: true,
      },
      newLikeNotification: {
        type: Boolean,
        default: true,
      },
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
  subSubCategory: "text",
  productCategory: "text",
  tags: "text",
});

// Virtual for auto deactivate date calculation
productSchema.virtual("nextAutoDeactivateDate").get(function () {
  if (!this.autoDeactivateEnabled || !this.lastActivatedAt) {
    return null;
  }
  const nextDate = new Date(this.lastActivatedAt);
  nextDate.setDate(nextDate.getDate() + 14);
  return nextDate;
});

// Pre-save middleware to update auto deactivate date
productSchema.pre("save", function (next) {
  if (
    this.isModified("isActive") &&
    this.isActive &&
    this.autoDeactivateEnabled
  ) {
    this.lastActivatedAt = new Date();
    this.autoDeactivateAt = new Date();
    this.autoDeactivateAt.setDate(this.autoDeactivateAt.getDate() + 14);
  }
  next();
});

// Method to activate product
productSchema.methods.activateProduct = function () {
  this.isActive = true;
  this.lastActivatedAt = new Date();
  this.autoDeactivateAt = new Date();
  this.autoDeactivateAt.setDate(this.autoDeactivateAt.getDate() + 14);
  return this.save();
};

// Method to add like
productSchema.methods.addLike = function (userId: Types.ObjectId) {
  const existingLike = this.likes.find(
    (like: any) => like.user.toString() === userId.toString()
  );
  if (!existingLike) {
    this.likes.push({ user: userId, createdAt: new Date() });
    this.totalLikes = this.likes.length;
    return this.save();
  }
  return Promise.resolve(this);
};

// Method to remove like
productSchema.methods.removeLike = function (userId: Types.ObjectId) {
  this.likes = this.likes.filter(
    (like: any) => like.user.toString() !== userId.toString()
  );
  this.totalLikes = this.likes.length;
  return this.save();
};

// Method to add comment
productSchema.methods.addComment = function (
  userId: Types.ObjectId,
  comment: string,
  rating?: number
) {
  this.comments.push({
    user: userId,
    comment,
    rating,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  this.totalComments = this.comments.length;

  // Update average rating if rating provided
  if (rating) {
    const ratings = this.comments
      .filter((c: any) => c.rating)
      .map((c: any) => c.rating!);
    this.rating =
      ratings.reduce((sum: number, r: number) => sum + r, 0) / ratings.length;
    this.totalRatings = ratings.length;
  }

  return this.save();
};

// Method to add order
productSchema.methods.addOrder = function (
  userId: Types.ObjectId,
  orderId: string,
  quantity: number,
  totalPrice: number
) {
  this.orders.push({
    user: userId,
    orderId,
    quantity,
    totalPrice,
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  this.totalOrders = this.orders.length;
  this.totalRevenue += totalPrice;
  return this.save();
};

// Static method to find products that need auto deactivation
productSchema.statics.findProductsForAutoDeactivation = function () {
  const now = new Date();
  return this.find({
    isActive: true,
    autoDeactivateEnabled: true,
    autoDeactivateAt: { $lte: now },
  });
};

// Static method to find products that need reminder (7 days before deactivation)
productSchema.statics.findProductsForReminder = function () {
  const now = new Date();
  const reminderDate = new Date(now);
  reminderDate.setDate(reminderDate.getDate() + 7);

  return this.find({
    isActive: true,
    autoDeactivateEnabled: true,
    autoDeactivateAt: { $lte: reminderDate, $gt: now },
  });
};

export const Product = mongoose.model<IProduct & Document, IProductModel>(
  "Product",
  productSchema
);
