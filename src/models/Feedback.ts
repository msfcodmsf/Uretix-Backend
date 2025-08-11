import mongoose, { Schema, Document } from "mongoose";

export interface IFeedback extends Document {
  producer: mongoose.Types.ObjectId;
  type: "bug" | "feature" | "complaint" | "suggestion" | "other";
  subject: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "open" | "in-progress" | "resolved" | "closed";
  adminResponse?: string;
  adminResponseDate?: Date;
  respondedBy?: mongoose.Types.ObjectId;
  attachments?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const feedbackSchema = new Schema<IFeedback>(
  {
    producer: {
      type: Schema.Types.ObjectId,
      ref: "Producer",
      required: true,
    },
    type: {
      type: String,
      enum: ["bug", "feature", "complaint", "suggestion", "other"],
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["open", "in-progress", "resolved", "closed"],
      default: "open",
    },
    adminResponse: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    adminResponseDate: {
      type: Date,
    },
    respondedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    attachments: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Üretici ve durum bazında index
feedbackSchema.index({ producer: 1, status: 1, createdAt: -1 });
feedbackSchema.index({ status: 1, priority: 1, createdAt: -1 });

export default mongoose.model<IFeedback>("Feedback", feedbackSchema);
