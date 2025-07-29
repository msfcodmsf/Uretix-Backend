import mongoose, { Document, Schema, Types } from "mongoose";

export interface IJobApplication {
  _id: string;
  id: string; // Virtual property for _id
  productionListing: Types.ObjectId;
  applicant: Types.ObjectId;
  coverLetter: string;
  resume: string;
  status: string;
  appliedAt: Date;
  reviewedAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const jobApplicationSchema = new Schema<IJobApplication & Document>(
  {
    productionListing: {
      type: Schema.Types.ObjectId,
      ref: "ProductionListing",
      required: true,
    },
    applicant: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    coverLetter: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    resume: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      default: "bekleyen",
      enum: ["bekleyen", "inceleniyor", "mülakat", "kabul", "red"],
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
    },
    notes: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

export const JobApplication = mongoose.model<IJobApplication & Document>(
  "JobApplication",
  jobApplicationSchema
);
