import mongoose, { Document, Schema, Types } from "mongoose";

export interface IProductionListing {
  _id: Types.ObjectId;
  id: string; // Virtual property for _id
  producer: Types.ObjectId;
  title: string;
  subCategory?: string;
  subSubCategory?: string;
  type: string;
  salary?: {
    min: number;
    max: number;
    currency: string;
  };
  benefits?: string[];
  coverImage?: string;
  videoUrl?: string;
  detailImages?: string[];
  documents?: string[];
  technicalDetails?: string;
  productionQuantity?: string;
  logisticsModel?: string;
  rawMaterial?: string;
  productionMethod?: string;
  productionCategory?: string;
  isActive: boolean;
  applications: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;

  // Otomatik pasif hale getirme sistemi
  lastActivatedAt?: Date; // Son aktif edilme tarihi
  autoDeactivateAt?: Date; // Otomatik pasif hale gelecek tarih
  autoDeactivateEnabled: boolean; // Otomatik pasif hale getirme aktif mi

  // Kullanıcı etkileşimleri
  likes: Array<{
    user: Types.ObjectId;
    createdAt: Date;
  }>;
  offers: Array<{
    user: Types.ObjectId;
    offerId: string;
    status: "pending" | "accepted" | "rejected";
    price: number;
    currency: string;
    message?: string;
    deliveryTime?: string;
    createdAt: Date;
    updatedAt: Date;
  }>;

  // İstatistikler
  totalLikes: number;
  totalOffers: number;
  totalViews: number;

  // Bildirim ayarları
  notificationSettings: {
    autoDeactivateReminder: boolean; // 14 gün öncesi uyarı
    newOfferNotification: boolean;
    newLikeNotification: boolean;
  };

  // Methods
  addLike(userId: Types.ObjectId): Promise<IProductionListing>;
  removeLike(userId: Types.ObjectId): Promise<IProductionListing>;
  addOffer(
    userId: Types.ObjectId,
    offerId: string,
    price: number,
    currency: string,
    message?: string,
    deliveryTime?: string
  ): Promise<IProductionListing>;
  activateProductionListing(): Promise<IProductionListing>;
}

const productionListingSchema = new Schema<IProductionListing & Document>(
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
    subCategory: {
      type: String,
      trim: true,
    },
    subSubCategory: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["tam zamanlı", "yarı zamanlı", "uzaktan", "staj", "üretim"],
    },
    salary: {
      min: {
        type: Number,
        min: 0,
      },
      max: {
        type: Number,
        min: 0,
      },
      currency: {
        type: String,
        default: "TL",
        enum: ["TL", "USD", "EUR"],
      },
    },
    benefits: [
      {
        type: String,
        trim: true,
      },
    ],
    coverImage: {
      type: String,
      trim: true,
    },
    videoUrl: {
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
    technicalDetails: {
      type: String,
      trim: true,
      maxlength: 800,
    },
    productionQuantity: {
      type: String,
      trim: true,
    },
    logisticsModel: {
      type: String,
      trim: true,
    },
    rawMaterial: {
      type: String,
      trim: true,
    },
    productionMethod: {
      type: String,
      trim: true,
    },
    productionCategory: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    applications: [
      {
        type: Schema.Types.ObjectId,
        ref: "JobApplication",
      },
    ],

    // Otomatik pasif hale getirme sistemi
    lastActivatedAt: {
      type: Date,
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
    offers: [
      {
        user: {
          type: Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        offerId: {
          type: String,
          required: true,
        },
        status: {
          type: String,
          enum: ["pending", "accepted", "rejected"],
          default: "pending",
        },
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        currency: {
          type: String,
          required: true,
          enum: ["TL", "USD", "EUR"],
        },
        message: {
          type: String,
          trim: true,
          maxlength: 1000,
        },
        deliveryTime: {
          type: String,
          trim: true,
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
    },
    totalOffers: {
      type: Number,
      default: 0,
    },
    totalViews: {
      type: Number,
      default: 0,
    },

    // Bildirim ayarları
    notificationSettings: {
      autoDeactivateReminder: {
        type: Boolean,
        default: true,
      },
      newOfferNotification: {
        type: Boolean,
        default: true,
      },
      newLikeNotification: {
        type: Boolean,
        default: true,
      },
    },
  },
  { timestamps: true }
);

// Virtual for id
productionListingSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

// Virtual for next auto deactivate date
productionListingSchema.virtual("nextAutoDeactivateDate").get(function () {
  if (!this.autoDeactivateEnabled || !this.lastActivatedAt) {
    return null;
  }
  const nextDate = new Date(this.lastActivatedAt);
  nextDate.setDate(nextDate.getDate() + 14); // 14 gün sonra
  return nextDate;
});

// Pre-save middleware to update auto deactivate date when isActive changes to true
productionListingSchema.pre("save", function (next) {
  if (this.isModified("isActive") && this.isActive) {
    this.lastActivatedAt = new Date();
    this.autoDeactivateAt = new Date();
    this.autoDeactivateAt.setDate(this.autoDeactivateAt.getDate() + 14); // 14 gün sonra
  }
  next();
});

// Instance methods
productionListingSchema.methods.activateProductionListing = async function () {
  this.isActive = true;
  this.lastActivatedAt = new Date();
  this.autoDeactivateAt = new Date();
  this.autoDeactivateAt.setDate(this.autoDeactivateAt.getDate() + 14);
  return await this.save();
};

productionListingSchema.methods.addLike = async function (
  userId: Types.ObjectId
) {
  const existingLike = this.likes.find(
    (like: any) => like.user.toString() === userId.toString()
  );
  if (!existingLike) {
    this.likes.push({ user: userId, createdAt: new Date() });
    this.totalLikes = this.likes.length;
    await this.save();
  }
  return this;
};

productionListingSchema.methods.removeLike = async function (
  userId: Types.ObjectId
) {
  this.likes = this.likes.filter(
    (like: any) => like.user.toString() !== userId.toString()
  );
  this.totalLikes = this.likes.length;
  await this.save();
  return this;
};

productionListingSchema.methods.addOffer = async function (
  userId: Types.ObjectId,
  offerId: string,
  price: number,
  currency: string,
  message?: string,
  deliveryTime?: string
) {
  const existingOffer = this.offers.find(
    (offer: any) => offer.user.toString() === userId.toString()
  );
  if (existingOffer) {
    throw new Error("Bu üretim ilanı için zaten teklif vermişsiniz");
  }

  this.offers.push({
    user: userId,
    offerId,
    status: "pending",
    price,
    currency,
    message,
    deliveryTime,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  this.totalOffers = this.offers.length;
  await this.save();
  return this;
};

// Static methods
productionListingSchema.statics.findProductionListingsForAutoDeactivation =
  function () {
    return this.find({
      isActive: true,
      autoDeactivateEnabled: true,
      autoDeactivateAt: { $lte: new Date() },
    });
  };

productionListingSchema.statics.findProductionListingsForReminder =
  function () {
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + 7); // 7 gün sonra
    return this.find({
      isActive: true,
      autoDeactivateEnabled: true,
      autoDeactivateAt: { $lte: reminderDate },
      "notificationSettings.autoDeactivateReminder": true,
    });
  };

// Ensure virtual fields are serialized
productionListingSchema.set("toJSON", {
  virtuals: true,
});

export const ProductionListing = mongoose.model<IProductionListing & Document>(
  "ProductionListing",
  productionListingSchema
);
