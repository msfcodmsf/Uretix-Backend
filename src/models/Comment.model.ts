import mongoose, { Schema, Document, Model } from "mongoose";

export interface IComment extends Document {
  productId: mongoose.Types.ObjectId;
  userName: string;
  email: string;
  rating: number;
  comment: string;
  helpfulCount: number;
  likeCount: number;
  dislikeCount: number;
  replies: Array<{
    producerId: mongoose.Types.ObjectId;
    producerName: string;
    reply: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

// Static metodlar için interface
export interface ICommentModel extends Model<IComment> {
  findByProductId(productId: string): Promise<IComment[]>;
  getProductStats(productId: string): Promise<any[]>;
}

const commentSchema = new Schema<IComment, ICommentModel>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
    helpfulCount: {
      type: Number,
      default: 0,
    },
    likeCount: {
      type: Number,
      default: 0,
    },
    dislikeCount: {
      type: Number,
      default: 0,
    },
    replies: [
      {
        producerId: {
          type: Schema.Types.ObjectId,
          ref: "Producer",
          required: true,
        },
        producerName: {
          type: String,
          required: true,
          trim: true,
        },
        reply: {
          type: String,
          required: true,
          trim: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Ürün ID'sine göre yorumları getir
commentSchema.statics.findByProductId = function (productId: string) {
  return this.find({ productId }).sort({ createdAt: -1 });
};

// Yorum istatistiklerini getir
commentSchema.statics.getProductStats = function (productId: string) {
  return this.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(productId) } },
    {
      $group: {
        _id: null,
        totalComments: { $sum: 1 },
        averageRating: { $avg: "$rating" },
        totalLikes: { $sum: "$likeCount" },
        totalDislikes: { $sum: "$dislikeCount" },
        totalHelpful: { $sum: "$helpfulCount" },
      },
    },
  ]);
};

export const Comment = mongoose.model<IComment, ICommentModel>(
  "Comment",
  commentSchema
);
