import mongoose, { Document, Schema, Types } from "mongoose";

export interface INews {
  _id: Types.ObjectId;
  id: string; // Virtual property for _id
  producer: Types.ObjectId;
  title: string;
  description: string;
  category: string;
  subCategory?: string;
  coverImage?: string;
  videoUrl?: string;
  detailImages?: string[];
  tags: string[];
  isActive: boolean;
  isDeleted: boolean;
  views: number;
  likes: number;
  createdAt: Date;
  updatedAt: Date;
}

const newsSchema = new Schema<INews & Document>(
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
      maxlength: 70,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 70,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    subCategory: {
      type: String,
      trim: true,
    },
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
    isDeleted: {
      type: Boolean,
      default: false,
    },
    views: {
      type: Number,
      default: 0,
    },
    likes: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for id
newsSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
newsSchema.set("toJSON", {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret._id;
    if (ret._id) delete (ret as any)._id;
    if (ret.__v) delete (ret as any).__v;
    return ret;
  },
});

export const News = mongoose.model<INews & Document>("News", newsSchema);
