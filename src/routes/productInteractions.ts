import express from "express";
import { authenticateToken } from "../middleware/auth";
import { Product } from "../models/Product.model";
import { Notification } from "../models/Notification.model";
import ProductAutoDeactivationService from "../services/productAutoDeactivationService";
import { Types } from "mongoose";

interface AuthRequest extends express.Request {
  user?: any;
}

const router = express.Router();

// Ürün beğenme/beğenmeme
router.post(
  "/:productId/like",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const { productId } = req.params;
      const userId = req.user?.id;

      const product = await Product.findById(productId);
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "Ürün bulunamadı" });
      }

      const existingLike = product.likes.find(
        (like) => like.user.toString() === userId
      );

      if (existingLike) {
        // Beğeniyi kaldır
        await product.removeLike(new Types.ObjectId(userId));
        res.json({
          success: true,
          message: "Beğeni kaldırıldı",
          liked: false,
          totalLikes: product.totalLikes,
        });
      } else {
        // Beğeni ekle
        await product.addLike(new Types.ObjectId(userId));

        // Üreticiye bildirim gönder
        await ProductAutoDeactivationService.sendInteractionNotification(
          product,
          "like",
          userId
        );

        res.json({
          success: true,
          message: "Ürün beğenildi",
          liked: true,
          totalLikes: product.totalLikes,
        });
      }
    } catch (error) {
      console.error("Beğeni işlemi hatası:", error);
      res
        .status(500)
        .json({ success: false, message: "Beğeni işlemi başarısız" });
    }
  }
);

// Ürün yorumu ekleme
router.post(
  "/:productId/comment",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const { productId } = req.params;
      const { comment, rating } = req.body;
      const userId = req.user?.id;

      if (!comment || comment.trim().length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "Yorum boş olamaz" });
      }

      const product = await Product.findById(productId);
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "Ürün bulunamadı" });
      }

      // Kullanıcının daha önce yorum yapıp yapmadığını kontrol et
      const existingComment = product.comments.find(
        (c) => c.user.toString() === userId
      );
      if (existingComment) {
        return res.status(400).json({
          success: false,
          message: "Bu ürün için zaten yorum yapmışsınız",
        });
      }

      await product.addComment(new Types.ObjectId(userId), comment, rating);

      // Üreticiye bildirim gönder
      await ProductAutoDeactivationService.sendInteractionNotification(
        product,
        "comment",
        userId,
        { comment, rating }
      );

      res.json({
        success: true,
        message: "Yorum başarıyla eklendi",
        totalComments: product.totalComments,
        averageRating: product.rating,
      });
    } catch (error) {
      console.error("Yorum ekleme hatası:", error);
      res
        .status(500)
        .json({ success: false, message: "Yorum eklenirken hata oluştu" });
    }
  }
);

// Ürün yorumlarını getirme
router.get("/:productId/comments", async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const product = await Product.findById(productId)
      .populate("comments.user", "name email")
      .select("comments");

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Ürün bulunamadı" });
    }

    const skip = (Number(page) - 1) * Number(limit);
    const comments = product.comments
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(skip, skip + Number(limit));

    res.json({
      success: true,
      data: comments,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: product.comments.length,
        pages: Math.ceil(product.comments.length / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Yorumları getirme hatası:", error);
    res
      .status(500)
      .json({ success: false, message: "Yorumlar yüklenirken hata oluştu" });
  }
});

// Ürün siparişi oluşturma
router.post(
  "/:productId/order",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const { productId } = req.params;
      const { quantity, variantId } = req.body;
      const userId = req.user?.id;

      if (!quantity || quantity < 1) {
        return res
          .status(400)
          .json({ success: false, message: "Geçerli miktar giriniz" });
      }

      const product = await Product.findById(productId);
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "Ürün bulunamadı" });
      }

      if (!product.isActive) {
        return res
          .status(400)
          .json({ success: false, message: "Bu ürün şu anda satışta değil" });
      }

      // Stok kontrolü
      let variant;
      if (variantId) {
        variant = product.productVariants.find(
          (v) => v._id?.toString() === variantId
        );
        if (!variant) {
          return res
            .status(400)
            .json({ success: false, message: "Varyant bulunamadı" });
        }
        if (variant.stock < quantity) {
          return res
            .status(400)
            .json({ success: false, message: "Yeterli stok bulunmuyor" });
        }
      } else {
        if (product.availableQuantity < quantity) {
          return res
            .status(400)
            .json({ success: false, message: "Yeterli stok bulunmuyor" });
        }
      }

      const price = variant
        ? variant.price
        : product.productVariants[0]?.price || 0;
      const totalPrice = price * quantity;
      const orderId = `ORD-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      await product.addOrder(
        new Types.ObjectId(userId),
        orderId,
        quantity,
        totalPrice
      );

      // Üreticiye bildirim gönder
      await ProductAutoDeactivationService.sendInteractionNotification(
        product,
        "order",
        userId,
        { orderId, quantity, totalPrice }
      );

      res.json({
        success: true,
        message: "Sipariş başarıyla oluşturuldu",
        data: {
          orderId,
          quantity,
          totalPrice,
          status: "pending",
        },
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

// Ürün istatistiklerini getirme
router.get("/:productId/stats", async (req, res) => {
  try {
    const { productId } = req.params;

    const product = await Product.findById(productId).select(
      "totalLikes totalComments totalOrders totalRevenue rating totalRatings"
    );

    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Ürün bulunamadı" });
    }

    res.json({
      success: true,
      data: {
        totalLikes: product.totalLikes,
        totalComments: product.totalComments,
        totalOrders: product.totalOrders,
        totalRevenue: product.totalRevenue,
        averageRating: product.rating,
        totalRatings: product.totalRatings,
      },
    });
  } catch (error) {
    console.error("İstatistik getirme hatası:", error);
    res.status(500).json({
      success: false,
      message: "İstatistikler yüklenirken hata oluştu",
    });
  }
});

// Kullanıcının ürün beğeni durumunu kontrol etme
router.get(
  "/:productId/like-status",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const { productId } = req.params;
      const userId = req.user?.id;

      const product = await Product.findById(productId).select("likes");
      if (!product) {
        return res
          .status(404)
          .json({ success: false, message: "Ürün bulunamadı" });
      }

      const isLiked = product.likes.some(
        (like) => like.user.toString() === userId
      );

      res.json({
        success: true,
        data: {
          isLiked,
          totalLikes: product.likes.length,
        },
      });
    } catch (error) {
      console.error("Beğeni durumu kontrol hatası:", error);
      res.status(500).json({
        success: false,
        message: "Beğeni durumu kontrol edilirken hata oluştu",
      });
    }
  }
);

export default router;
