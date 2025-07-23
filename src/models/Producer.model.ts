import mongoose, { Document, Schema, Types } from "mongoose";
import { IUser } from "./User.model";

export interface IProducer extends Document {
  _id: string;
  user: Types.ObjectId;
  companyName: string;
  taxIdNumber: string;
  phoneNumber?: string;
  gender?: string;
  backupPhone?: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const producerSchema = new Schema<IProducer>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    companyName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    taxIdNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      maxlength: 20,
    },
    phoneNumber: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    gender: {
      type: String,
      trim: true,
      enum: ["male", "female", "other"],
    },
    backupPhone: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Tax ID number validation (simplified)
producerSchema.path("taxIdNumber").validate(function (value: string) {
  if (!value) return false;

  // Just check if it's 10 digits for now
  if (!/^\d{10}$/.test(value)) {
    return false;
  }

  return true;
}, "Vergi kimlik numarası 10 haneli olmalıdır");

export const Producer = mongoose.model<IProducer>("Producer", producerSchema);
