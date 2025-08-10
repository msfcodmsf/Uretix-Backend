import express, { Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import { Order } from "../models/Order.model";
import { Cart } from "../models/Cart.model";
import { Product } from "../models/Product.model";
import { User } from "../models/User.model";
import { Producer } from "../models/Producer.model";

interface AuthRequest extends Request {
  user?: any;
}

const router = express.Router();

// Kullanıcının siparişlerini getir
router.get(
  "/my-orders",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      const orders = await Order.find({ buyer: userId })
        .populate("seller", "companyName city district")
        .populate({
          path: "products.product",
          populate: {
            path: "producer",
            select: "companyName city district",
          },
        })
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        data: orders,
      });
    } catch (error) {
      console.error("Sipariş getirme hatası:", error);
      res.status(500).json({
        success: false,
        message: "Siparişler getirilirken hata oluştu",
      });
    }
  }
);

// Üreticinin siparişlerini getir
router.get(
  "/my-sales",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      // Kullanıcının üretici olup olmadığını kontrol et
      const producer = await Producer.findOne({ user: userId });
      if (!producer) {
        return res.status(403).json({
          success: false,
          message: "Bu işlem için üretici olmanız gerekiyor",
        });
      }

      const orders = await Order.find({ seller: producer._id })
        .populate("buyer", "name email")
        .populate({
          path: "products.product",
          populate: {
            path: "producer",
            select: "companyName city district",
          },
        })
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        data: orders,
      });
    } catch (error) {
      console.error("Satış getirme hatası:", error);
      res.status(500).json({
        success: false,
        message: "Satışlar getirilirken hata oluştu",
      });
    }
  }
);

// Sipariş detayını getir
router.get(
  "/:orderId",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;

      const order = await Order.findById(orderId)
        .populate("buyer", "name email")
        .populate("seller", "companyName city district phone email")
        .populate({
          path: "products.product",
          populate: {
            path: "producer",
            select: "companyName city district",
          },
        });

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Sipariş bulunamadı",
        });
      }

      // Sadece sipariş sahibi veya üretici görebilir
      const producer = await Producer.findOne({ user: userId });
      const buyerId = (order.buyer as any)._id || order.buyer;
      const sellerId = (order.seller as any)._id || order.seller;

      if (
        buyerId.toString() !== userId &&
        (!producer || sellerId.toString() !== producer._id.toString())
      ) {
        return res.status(403).json({
          success: false,
          message: "Bu siparişi görme yetkiniz yok",
        });
      }

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      console.error("Sipariş detay getirme hatası:", error);
      res.status(500).json({
        success: false,
        message: "Sipariş detayı getirilirken hata oluştu",
      });
    }
  }
);

// Sepetten sipariş oluştur
router.post(
  "/create-from-cart",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { shippingAddress, billingAddress, notes } = req.body;

      // Sepeti getir
      const cart = await Cart.findOne({ user: userId }).populate({
        path: "items.product",
        populate: {
          path: "producer",
          select: "companyName city district",
        },
      });

      if (!cart || cart.items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Sepetiniz boş",
        });
      }

      // Ürünleri üreticilere göre grupla
      const ordersBySeller = new Map();

      for (const item of cart.items) {
        const product = item.product as any;
        const sellerId = product.producer._id.toString();

        if (!ordersBySeller.has(sellerId)) {
          ordersBySeller.set(sellerId, {
            seller: product.producer._id,
            products: [],
            totalAmount: 0,
          });
        }

        const orderData = ordersBySeller.get(sellerId);
        orderData.products.push({
          product: item.product._id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          selectedVariant: item.selectedVariant,
        });
        orderData.totalAmount += item.totalPrice;
      }

      // Her üretici için ayrı sipariş oluştur
      const createdOrders = [];

      for (const [sellerId, orderData] of ordersBySeller) {
        const order = new Order({
          buyer: userId,
          seller: orderData.seller,
          products: orderData.products,
          totalAmount: orderData.totalAmount,
          currency: "TL",
          status: "bekleyen",
          paymentStatus: "bekleyen",
          shippingAddress,
          billingAddress,
          paymentMethod: "Kapıda Ödeme",
          shippingMethod: "Üretici Teslim",
          notes,
          estimatedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 gün sonra
        });

        await order.save();
        createdOrders.push(order);
      }

      // Sepeti temizle
      cart.items = [];
      await cart.save();

      res.json({
        success: true,
        message: "Siparişler başarıyla oluşturuldu",
        data: createdOrders,
      });
    } catch (error) {
      console.error("Sipariş oluşturma hatası:", error);
      res.status(500).json({
        success: false,
        message: "Sipariş oluşturulurken hata oluştu",
      });
    }
  }
);

// Sipariş durumunu güncelle (üretici için)
router.put(
  "/:orderId/status",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { orderId } = req.params;
      const { status } = req.body;
      const userId = req.user?.id;

      // Üretici kontrolü
      const producer = await Producer.findOne({ user: userId });
      if (!producer) {
        return res.status(403).json({
          success: false,
          message: "Bu işlem için üretici olmanız gerekiyor",
        });
      }

      const order = await Order.findById(orderId)
        .populate("seller", "_id companyName")
        .populate("buyer", "_id name email");
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Sipariş bulunamadı",
        });
      }

      // Sadece siparişin üreticisi güncelleyebilir
      const sellerId = (order.seller as any)._id || order.seller;
      if (sellerId.toString() !== producer._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Bu siparişi güncelleme yetkiniz yok",
        });
      }

      // Sadece status ve actualDeliveryDate alanlarını güncelle
      const updateData: any = { status };
      if (status === "teslim edildi") {
        updateData.actualDeliveryDate = new Date();
      }

      const updatedOrder = await Order.findByIdAndUpdate(orderId, updateData, {
        new: true,
      });

      res.json({
        success: true,
        message: "Sipariş durumu güncellendi",
        data: updatedOrder,
      });
    } catch (error) {
      console.error("Sipariş durumu güncelleme hatası:", error);
      res.status(500).json({
        success: false,
        message: "Sipariş durumu güncellenirken hata oluştu",
      });
    }
  }
);

// Siparişi iptal et
router.put(
  "/:orderId/cancel",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const { orderId } = req.params;
      const userId = req.user?.id;

      const order = await Order.findById(orderId)
        .populate("seller", "_id companyName")
        .populate("buyer", "_id name email");
      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Sipariş bulunamadı",
        });
      }

      // Sadece sipariş sahibi iptal edebilir
      const buyerId = (order.buyer as any)._id || order.buyer;
      if (buyerId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "Bu siparişi iptal etme yetkiniz yok",
        });
      }

      // Sadece bekleyen siparişler iptal edilebilir
      if (order.status !== "bekleyen") {
        return res.status(400).json({
          success: false,
          message: "Bu sipariş artık iptal edilemez",
        });
      }

      const updatedOrder = await Order.findByIdAndUpdate(
        orderId,
        { status: "iptal edildi" },
        { new: true }
      );

      res.json({
        success: true,
        message: "Sipariş iptal edildi",
        data: updatedOrder,
      });
    } catch (error) {
      console.error("Sipariş iptal hatası:", error);
      res.status(500).json({
        success: false,
        message: "Sipariş iptal edilirken hata oluştu",
      });
    }
  }
);

export default router;
