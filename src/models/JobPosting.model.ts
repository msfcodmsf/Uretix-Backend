import mongoose, { Document, Schema, Types } from "mongoose";

export interface IJobPosting {
  _id: string;
  id: string; // Virtual property for _id
  producer: Types.ObjectId;
  title: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  location: string;
  type: string;
  salary: {
    min: number;
    max: number;
    currency: string;
  };
  benefits: string[];
  isActive: boolean;
  applications: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const jobPostingSchema = new Schema<IJobPosting & Document>(
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
    description: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    requirements: [
      {
        type: String,
        trim: true,
      },
    ],
    responsibilities: [
      {
        type: String,
        trim: true,
      },
    ],
    location: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["tam zamanlı", "yarı zamanlı", "uzaktan", "staj"],
    },
    salary: {
      min: {
        type: Number,
        required: true,
        min: 0,
      },
      max: {
        type: Number,
        required: true,
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
  },
  {
    timestamps: true,
  }
);

export const JobPosting = mongoose.model<IJobPosting & Document>(
  "JobPosting",
  jobPostingSchema
);
