import mongoose, { Document, Schema, Types } from "mongoose";

export interface IJobPosting extends Document {
  _id: string;
  producer: Types.ObjectId;
  title: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  location: string;
  salary: {
    min: number;
    max: number;
    currency: string;
    period: string;
  };
  jobType: string;
  experienceLevel: string;
  educationLevel: string;
  skills: string[];
  benefits: string[];
  isActive: boolean;
  isUrgent: boolean;
  applications: Types.ObjectId[];
  totalApplications: number;
  createdAt: Date;
  updatedAt: Date;
}

const jobPostingSchema = new Schema<IJobPosting>(
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
      maxlength: 200,
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
      period: {
        type: String,
        default: "aylık",
        enum: ["saatlik", "günlük", "haftalık", "aylık", "yıllık"],
      },
    },
    jobType: {
      type: String,
      required: true,
      enum: ["tam zamanlı", "yarı zamanlı", "sözleşmeli", "staj", "freelance"],
    },
    experienceLevel: {
      type: String,
      required: true,
      enum: ["deneyimsiz", "1-3 yıl", "3-5 yıl", "5-10 yıl", "10+ yıl"],
    },
    educationLevel: {
      type: String,
      required: true,
      enum: [
        "ilkokul",
        "ortaokul",
        "lise",
        "önlisans",
        "lisans",
        "yükseklisans",
        "doktora",
      ],
    },
    skills: [
      {
        type: String,
        trim: true,
      },
    ],
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
    isUrgent: {
      type: Boolean,
      default: false,
    },
    applications: [
      {
        type: Schema.Types.ObjectId,
        ref: "JobApplication",
      },
    ],
    totalApplications: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export const JobPosting = mongoose.model<IJobPosting>(
  "JobPosting",
  jobPostingSchema
);
