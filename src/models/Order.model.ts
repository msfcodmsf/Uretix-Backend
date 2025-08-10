import mongoose, { Document, Schema, Types } from "mongoose";

export interface IOrder {
  _id: string;
  id: string; // Virtual property for _id
  orderNumber: string; // Özel sipariş numarası
  buyer: Types.ObjectId;
  seller: Types.ObjectId;
  products: {
    product: Types.ObjectId;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  totalAmount: number;
  currency: string;
  status: string;
  paymentStatus: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    district: string;
    postalCode: string;
  };
  billingAddress: {
    fullName: string;
    phone: string;
    address: string;
    city: string;
    district: string;
    postalCode: string;
  };
  paymentMethod: string;
  shippingMethod: string;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder & Document>(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
    },
    buyer: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    seller: {
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
        "teslim edildi",
        "iptal edildi",
      ],
    },
    paymentStatus: {
      type: String,
      default: "bekleyen",
      enum: ["bekleyen", "ödendi", "iade edildi"],
    },
    shippingAddress: {
      fullName: {
        type: String,
        required: true,
        trim: true,
      },
      phone: {
        type: String,
        required: true,
        trim: true,
      },
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
    },
    billingAddress: {
      fullName: {
        type: String,
        required: true,
        trim: true,
      },
      phone: {
        type: String,
        required: true,
        trim: true,
      },
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
    },
    paymentMethod: {
      type: String,
      required: true,
      trim: true,
    },
    shippingMethod: {
      type: String,
      required: true,
      trim: true,
    },
    estimatedDeliveryDate: {
      type: Date,
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

// Sipariş numarası oluştur
const generateOrderNumber = async (): Promise<string> => {
  let orderNumber: string;
  let exists = true;

  while (exists) {
    // UX- prefixi ile 8 haneli rastgele alfanumerik kod
    const randomCode = Math.random()
      .toString(36)
      .substring(2, 10)
      .toUpperCase();
    orderNumber = `UX-${randomCode}`;

    // Bu numara daha önce kullanılmış mı kontrol et
    const existingOrder = await mongoose
      .model("Order")
      .findOne({ orderNumber });
    exists = !!existingOrder;
  }

  return orderNumber!;
};

// Pre-save middleware: Sipariş numarası otomatik oluştur
orderSchema.pre("save", async function (next) {
  if (this.isNew && !this.orderNumber) {
    this.orderNumber = await generateOrderNumber();
  }
  next();
});

export const Order = mongoose.model<IOrder & Document>("Order", orderSchema);
