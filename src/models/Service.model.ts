import mongoose, { Document, Schema, Types } from "mongoose";

export interface IService {
  _id: Types.ObjectId;
  id: string; // Virtual property for _id
  producer: Types.ObjectId; // Üretici ID'si
  title: string; // Hizmet başlığı
  description: string; // Hizmet açıklaması
  category: Types.ObjectId; // Kategori ID'si
  categoryName?: string; // Kategori adı (populate için)
  tags: string[]; // Hizmet alanları/etiketler
  images: string[]; // Hizmet görselleri
  videoUrl?: string; // Hizmet videosu
  isActive: boolean; // Hizmet aktif mi?
  views: number; // Görüntüleme sayısı
  offers: number; // Teklif sayısı
  autoRenewalDate?: Date; // Otomatik yenileme tarihi
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new Schema<IService & Document>(
  {
    producer: {
      type: Schema.Types.ObjectId,
      ref: "Producer",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 70,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "AdvertisementCategory",
      required: true,
    },
    categoryName: {
      type: String,
      trim: true,
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: 50,
      },
    ],
    images: [
      {
        type: String,
        trim: true,
      },
    ],
    videoUrl: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    offers: {
      type: Number,
      default: 0,
    },
    autoRenewalDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Virtual for id
serviceSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
serviceSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret._id;
    // Keep _id for frontend compatibility
    // delete (ret as any)._id;
    delete (ret as any).__v;
    return ret;
  },
});

// Indexes
serviceSchema.index({ producer: 1, isActive: 1 });
serviceSchema.index({ category: 1, isActive: 1 });
serviceSchema.index({ createdAt: -1 });
serviceSchema.index({ views: -1 });
serviceSchema.index({ offers: -1 });

// Pre-save middleware to update categoryName
serviceSchema.pre("save", async function (next) {
  if (this.isModified("category")) {
    try {
      const AdvertisementCategory = mongoose.model("AdvertisementCategory");
      const category = await AdvertisementCategory.findById(this.category);
      if (category) {
        this.categoryName = category.name;
      }
    } catch (error) {
      console.error("Error updating categoryName:", error);
    }
  }
  next();
});

// Pre-find middleware to populate categoryName - temporarily disabled
// serviceSchema.pre("find", function (this: any) {
//   this.populate("category", "_id name");
// });

// serviceSchema.pre("findOne", function (this: any) {
//   this.populate("category", "_id name");
// });

const Service = mongoose.model<IService & Document>("Service", serviceSchema);

export default Service;
