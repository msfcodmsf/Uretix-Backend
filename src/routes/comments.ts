import express from "express";
import { Comment, IComment } from "../models/Comment.model";
import { Product } from "../models/Product.model";
import { Producer } from "../models/Producer.model";
import { authenticateToken } from "../middleware/auth";

interface AuthRequest extends express.Request {
  user?: any;
}

const router = express.Router();

// Ürün yorumlarını getir
router.get("/products/:productId/comments", async (req, res) => {
  try {
    const { productId } = req.params;

    // Ürünün var olup olmadığını kontrol et
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Ürün bulunamadı",
      });
    }

    // Yorumları getir
    const comments = await Comment.findByProductId(productId);

    // Yorumları frontend formatına dönüştür
    const formattedComments = comments.map((comment: IComment) => ({
      id: comment._id?.toString() || "",
      userName: comment.userName,
      date: comment.createdAt.toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      rating: comment.rating,
      comment: comment.comment,
      helpfulCount: comment.helpfulCount,
      likeCount: comment.likeCount,
      dislikeCount: comment.dislikeCount,
      replies:
        comment.replies?.map((reply) => ({
          producerId: reply.producerId?.toString() || "",
          producerName: reply.producerName,
          reply: reply.reply,
          date: reply.createdAt.toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
        })) || [],
    }));

    res.json({
      success: true,
      data: formattedComments,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    res.status(500).json({
      success: false,
      message: "Yorumlar yüklenirken hata oluştu",
    });
  }
});

// Yeni yorum oluştur (authenticated)
router.post(
  "/products/:productId/comments",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const { productId } = req.params;
      const { userName, email, rating, comment } = req.body;
      const userId = req.user?.id;

      // Validasyon
      if (!userName || !email || !rating || !comment) {
        return res.status(400).json({
          success: false,
          message: "Tüm alanlar zorunludur",
        });
      }

      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "Puan 1-5 arasında olmalıdır",
        });
      }

      // Ürünün var olup olmadığını kontrol et
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Ürün bulunamadı",
        });
      }

      // Üretici kendi ürününe yorum yapamaz
      const producer = await Producer.findOne({ user: userId });
      if (producer && product.producer.toString() === producer._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Kendi ürününüze yorum yapamazsınız!",
        });
      }

      // Yeni yorum oluştur
      const newComment = new Comment({
        productId,
        userName,
        email,
        rating,
        comment,
      });

      await newComment.save();

      // Ürünün yorum sayısını güncelle
      await Product.findByIdAndUpdate(productId, {
        $inc: { totalComments: 1 },
      });

      res.status(201).json({
        success: true,
        message: "Yorum başarıyla oluşturuldu",
        data: {
          id: newComment._id?.toString() || "",
          userName: newComment.userName,
          date: newComment.createdAt.toLocaleDateString("tr-TR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          rating: newComment.rating,
          comment: newComment.comment,
          helpfulCount: newComment.helpfulCount,
          likeCount: newComment.likeCount,
          dislikeCount: newComment.dislikeCount,
        },
      });
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({
        success: false,
        message: "Yorum oluşturulurken hata oluştu",
      });
    }
  }
);

// Yorum beğen (authenticated)
router.post(
  "/comments/:commentId/like",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const { commentId } = req.params;
      const userId = req.user?.id;

      // Yorumu bul
      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({
          success: false,
          message: "Yorum bulunamadı",
        });
      }

      // Ürünü bul
      const product = await Product.findById(comment.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Ürün bulunamadı",
        });
      }

      // Üretici kendi ürünündeki yorumları beğenemez
      const producer = await Producer.findOne({ user: userId });
      if (producer && product.producer.toString() === producer._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Kendi ürününüzdeki yorumları beğenemezsiniz!",
        });
      }

      // Beğeni sayısını artır
      const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        { $inc: { likeCount: 1 } },
        { new: true }
      );

      res.json({
        success: true,
        message: "Yorum beğenildi",
        data: {
          likeCount: updatedComment?.likeCount,
        },
      });
    } catch (error) {
      console.error("Error liking comment:", error);
      res.status(500).json({
        success: false,
        message: "İşlem sırasında hata oluştu",
      });
    }
  }
);

// Yorum beğenme (authenticated)
router.post(
  "/comments/:commentId/dislike",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const { commentId } = req.params;
      const userId = req.user?.id;

      // Yorumu bul
      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({
          success: false,
          message: "Yorum bulunamadı",
        });
      }

      // Ürünü bul
      const product = await Product.findById(comment.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Ürün bulunamadı",
        });
      }

      // Üretici kendi ürünündeki yorumları beğenemez
      const producer = await Producer.findOne({ user: userId });
      if (producer && product.producer.toString() === producer._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Kendi ürününüzdeki yorumları beğenemezsiniz!",
        });
      }

      // Beğenmeme sayısını artır
      const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        { $inc: { dislikeCount: 1 } },
        { new: true }
      );

      res.json({
        success: true,
        message: "Yorum beğenilmedi",
        data: {
          dislikeCount: updatedComment?.dislikeCount,
        },
      });
    } catch (error) {
      console.error("Error disliking comment:", error);
      res.status(500).json({
        success: false,
        message: "İşlem sırasında hata oluştu",
      });
    }
  }
);

// Yorumu faydalı bul (authenticated)
router.post(
  "/comments/:commentId/helpful",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const { commentId } = req.params;
      const userId = req.user?.id;

      // Yorumu bul
      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({
          success: false,
          message: "Yorum bulunamadı",
        });
      }

      // Ürünü bul
      const product = await Product.findById(comment.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Ürün bulunamadı",
        });
      }

      // Üretici kendi ürünündeki yorumları faydalı olarak işaretleyemez
      const producer = await Producer.findOne({ user: userId });
      if (producer && product.producer.toString() === producer._id.toString()) {
        return res.status(403).json({
          success: false,
          message:
            "Kendi ürününüzdeki yorumları faydalı olarak işaretleyemezsiniz!",
        });
      }

      // Faydalı sayısını artır
      const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        { $inc: { helpfulCount: 1 } },
        { new: true }
      );

      res.json({
        success: true,
        message: "Yorum faydalı olarak işaretlendi",
        data: {
          helpfulCount: updatedComment?.helpfulCount,
        },
      });
    } catch (error) {
      console.error("Error marking comment helpful:", error);
      res.status(500).json({
        success: false,
        message: "İşlem sırasında hata oluştu",
      });
    }
  }
);

// Yorum yanıtla (authenticated - sadece üretici)
router.post(
  "/comments/:commentId/reply",
  authenticateToken,
  async (req: AuthRequest, res) => {
    try {
      const { commentId } = req.params;
      const { reply } = req.body;
      const userId = req.user?.id;

      // Validasyon
      if (!reply || reply.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Yanıt metni gereklidir",
        });
      }

      // Yorumu bul
      const comment = await Comment.findById(commentId);
      if (!comment) {
        return res.status(404).json({
          success: false,
          message: "Yorum bulunamadı",
        });
      }

      // Ürünü bul
      const product = await Product.findById(comment.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Ürün bulunamadı",
        });
      }

      // Üreticiyi bul
      const producer = await Producer.findOne({ user: userId });
      if (!producer) {
        return res.status(403).json({
          success: false,
          message: "Sadece üreticiler yorum yanıtlayabilir",
        });
      }

      // Üretici sadece kendi ürünündeki yorumları yanıtlayabilir
      if (product.producer.toString() !== producer._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Sadece kendi ürününüzdeki yorumları yanıtlayabilirsiniz",
        });
      }

      // Yanıtı ekle
      const newReply = {
        producerId: producer._id,
        producerName: producer.companyName,
        reply: reply.trim(),
        createdAt: new Date(),
      };

      const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        { $push: { replies: newReply } },
        { new: true }
      );

      res.json({
        success: true,
        message: "Yanıt başarıyla gönderildi",
        data: {
          reply: newReply,
        },
      });
    } catch (error) {
      console.error("Error replying to comment:", error);
      res.status(500).json({
        success: false,
        message: "Yanıt gönderilirken hata oluştu",
      });
    }
  }
);

export default router;
