import mongoose, { Document, Schema, Types } from "mongoose";

export interface IJobApplication extends Document {
  _id: string;
  jobPosting: Types.ObjectId;
  applicant: Types.ObjectId;
  coverLetter: string;
  resume: string;
  status: string;
  appliedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: Types.ObjectId;
  notes?: string;
  interviewDate?: Date;
  interviewLocation?: string;
  interviewType?: string;
  createdAt: Date;
  updatedAt: Date;
}

const jobApplicationSchema = new Schema<IJobApplication>(
  {
    jobPosting: {
      type: Schema.Types.ObjectId,
      ref: "JobPosting",
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
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    notes: {
      type: String,
      maxlength: 1000,
    },
    interviewDate: {
      type: Date,
    },
    interviewLocation: {
      type: String,
      trim: true,
    },
    interviewType: {
      type: String,
      enum: ["yüz yüze", "online", "telefon"],
    },
  },
  {
    timestamps: true,
  }
);

export const JobApplication = mongoose.model<IJobApplication>(
  "JobApplication",
  jobApplicationSchema
);
