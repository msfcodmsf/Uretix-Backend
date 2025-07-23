import mongoose, { Document, Schema, Types } from "mongoose";

export interface IOrder extends Document {
  _id: string;
  orderNumber: string;
  customer: Types.ObjectId;
  producer: Types.ObjectId;
  products: {
    product: Types.ObjectId;
    quantity: number;
    price: number;
    variant?: string;
    color?: string;
  }[];
  totalAmount: number;
  currency: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  shippingAddress: {
    address: string;
    city: string;
    district: string;
    postalCode: string;
    phone: string;
  };
  deliveryMethod: string;
  estimatedDeliveryDate: Date;
  actualDeliveryDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    producer: {
      type: Schema.Types.ObjectId,
      ref: "Producer",
      required: true,
    },
    products: [
      {
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
        price: {
          type: Number,
          required: true,
          min: 0,
        },
        variant: {
          type: String,
          trim: true,
        },
        color: {
          type: String,
          trim: true,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "TL",
      enum: ["TL", "USD", "EUR"],
    },
    status: {
      type: String,
      default: "bekleyen",
      enum: [
        "bekleyen",
        "onaylandı",
        "hazırlanıyor",
        "kargoda",
        "teslim_edildi",
        "iptal",
        "iade",
      ],
    },
    paymentStatus: {
      type: String,
      default: "bekleyen",
      enum: ["bekleyen", "ödendi", "kısmi_ödendi", "iptal"],
    },
    paymentMethod: {
      type: String,
      required: true,
      trim: true,
    },
    shippingAddress: {
      address: {
        type: String,
        required: true,
        trim: true,
      },
      city: {
        type: String,
        required: true,
        trim: true,
      },
      district: {
        type: String,
        required: true,
        trim: true,
      },
      postalCode: {
        type: String,
        required: true,
        trim: true,
      },
      phone: {
        type: String,
        required: true,
        trim: true,
      },
    },
    deliveryMethod: {
      type: String,
      required: true,
      trim: true,
    },
    estimatedDeliveryDate: {
      type: Date,
      required: true,
    },
    actualDeliveryDate: {
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

// Otomatik sipariş numarası oluşturma
orderSchema.pre("save", async function (next) {
  if (this.isNew) {
    const count = await mongoose.model("Order").countDocuments();
    this.orderNumber = `SIPARIS-${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

export const Order = mongoose.model<IOrder>("Order", orderSchema);
