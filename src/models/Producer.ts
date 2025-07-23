import mongoose, { Document, Schema, Types } from "mongoose";
import { IUser } from "./User";

export interface IProducer extends Document {
  _id: string;
  user: Types.ObjectId;
  companyName: string;
  taxIdNumber: string;
  phoneNumber?: string;
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
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Tax ID number validation (Turkish tax number format)
producerSchema.path("taxIdNumber").validate(function (value: string) {
  if (!value) return false;

  // Turkish tax number should be 10 digits
  if (!/^\d{10}$/.test(value)) {
    return false;
  }

  // Basic validation for Turkish tax number
  const digits = value.split("").map(Number);
  let sum = 0;

  for (let i = 0; i < 9; i++) {
    let temp = (digits[i] + (10 - i)) % 10;
    if (temp === 9) temp = 0;
    sum += temp;
  }

  const lastDigit = sum % 10 === 0 ? 0 : 10 - (sum % 10);

  return lastDigit === digits[9];
}, "Geçersiz vergi kimlik numarası");

export const Producer = mongoose.model<IProducer>("Producer", producerSchema);
