import mongoose, { Document, Schema, Types } from "mongoose";

export interface ICartItem {
  product: Types.ObjectId;
  quantity: number;
  selectedVariant?: {
    size?: string;
    color?: string;
    price: number;
  };
  unitPrice: number;
  totalPrice: number;
}

export interface ICart {
  _id: string;
  id: string; // Virtual property for _id
  user: Types.ObjectId;
  items: ICartItem[];
  totalAmount: number;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const cartItemSchema = new Schema<ICartItem>({
  product: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  selectedVariant: {
    size: String,
    color: String,
    price: Number,
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  totalPrice: {
    type: Number,
    required: true,
    min: 0,
  },
});

const cartSchema = new Schema<ICart & Document>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: [cartItemSchema],
    totalAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    itemCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for calculating total amount
cartSchema.virtual("calculatedTotal").get(function () {
  return this.items.reduce((total, item) => total + item.totalPrice, 0);
});

// Virtual for calculating item count
cartSchema.virtual("calculatedItemCount").get(function () {
  return this.items.reduce((count, item) => count + item.quantity, 0);
});

// Pre-save middleware to update totals
cartSchema.pre("save", function (next) {
  this.totalAmount = this.items.reduce(
    (total, item) => total + item.totalPrice,
    0
  );
  this.itemCount = this.items.reduce((count, item) => count + item.quantity, 0);
  next();
});

export const Cart = mongoose.model<ICart & Document>("Cart", cartSchema);
