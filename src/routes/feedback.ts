import express, { Request, Response } from "express";
import {
  authenticateToken,
  requireProducer,
  requireAdmin,
} from "../middleware/auth";
import Feedback from "../models/Feedback";
import { Producer } from "../models/Producer.model";
import { AuthRequest } from "../types/auth";

const router = express.Router();

// Üretici: Geri bildirim oluştur
router.post(
  "/",
  authenticateToken,
  requireProducer,
  async (req: AuthRequest, res: Response) => {
    try {
      const { type, subject, description, priority, attachments } = req.body;

      if (!type || !subject || !description) {
        return res.status(400).json({
          success: false,
          message: "Tür, konu ve açıklama gerekli",
        });
      }

      // Üreticiyi bul
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Kullanıcı bilgisi bulunamadı",
        });
      }

      const producer = await Producer.findOne({ user: req.user.id });
      if (!producer) {
        return res.status(404).json({
          success: false,
          message: "Üretici bulunamadı",
        });
      }

      const feedback = new Feedback({
        producer: producer._id,
        type,
        subject,
        description,
        priority: priority || "medium",
        attachments: attachments || [],
      });

      await feedback.save();

      res.status(201).json({
        success: true,
        data: feedback,
        message: "Geri bildirim başarıyla gönderildi",
      });
    } catch (error) {
      console.error("Geri bildirim oluşturulurken hata:", error);
      res.status(500).json({
        success: false,
        message: "Geri bildirim gönderilirken hata oluştu",
      });
    }
  }
);

// Üretici: Kendi geri bildirimlerini getir
router.get(
  "/my",
  authenticateToken,
  requireProducer,
  async (req: AuthRequest, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Kullanıcı bilgisi bulunamadı",
        });
      }

      const producer = await Producer.findOne({ user: req.user.id });
      if (!producer) {
        return res.status(404).json({
          success: false,
          message: "Üretici bulunamadı",
        });
      }

      const feedbacks = await Feedback.find({ producer: producer._id }).sort({
        createdAt: -1,
      });

      res.json({
        success: true,
        data: feedbacks,
      });
    } catch (error) {
      console.error("Geri bildirimler getirilirken hata:", error);
      res.status(500).json({
        success: false,
        message: "Geri bildirimler getirilirken hata oluştu",
      });
    }
  }
);

// Üretici: Geri bildirim detayını getir
router.get(
  "/my/:id",
  authenticateToken,
  requireProducer,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Kullanıcı bilgisi bulunamadı",
        });
      }

      const producer = await Producer.findOne({ user: req.user.id });

      if (!producer) {
        return res.status(404).json({
          success: false,
          message: "Üretici bulunamadı",
        });
      }

      const feedback = await Feedback.findOne({
        _id: id,
        producer: producer._id,
      });

      if (!feedback) {
        return res.status(404).json({
          success: false,
          message: "Geri bildirim bulunamadı",
        });
      }

      res.json({
        success: true,
        data: feedback,
      });
    } catch (error) {
      console.error("Geri bildirim detayı getirilirken hata:", error);
      res.status(500).json({
        success: false,
        message: "Geri bildirim detayı getirilirken hata oluştu",
      });
    }
  }
);

// Admin: Tüm geri bildirimleri getir
router.get(
  "/admin",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { status, priority, type, page = 1, limit = 20 } = req.query;

      const filter: any = {};
      if (status) filter.status = status;
      if (priority) filter.priority = priority;
      if (type) filter.type = type;

      const skip = (Number(page) - 1) * Number(limit);

      const feedbacks = await Feedback.find(filter)
        .populate({
          path: "producer",
          select: "companyName user",
          populate: {
            path: "user",
            select: "firstName lastName email",
          },
        })
        .populate("respondedBy", "firstName lastName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      const total = await Feedback.countDocuments(filter);

      res.json({
        success: true,
        data: feedbacks,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Admin geri bildirimler getirilirken hata:", error);
      res.status(500).json({
        success: false,
        message: "Geri bildirimler getirilirken hata oluştu",
      });
    }
  }
);

// Admin: Geri bildirim istatistikleri
router.get(
  "/admin/stats",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const stats = await Feedback.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);

      const priorityStats = await Feedback.aggregate([
        {
          $group: {
            _id: "$priority",
            count: { $sum: 1 },
          },
        },
      ]);

      const typeStats = await Feedback.aggregate([
        {
          $group: {
            _id: "$type",
            count: { $sum: 1 },
          },
        },
      ]);

      const total = await Feedback.countDocuments();
      const openCount = await Feedback.countDocuments({ status: "open" });
      const criticalCount = await Feedback.countDocuments({
        priority: "critical",
      });

      res.json({
        success: true,
        data: {
          total,
          openCount,
          criticalCount,
          statusBreakdown: stats,
          priorityBreakdown: priorityStats,
          typeBreakdown: typeStats,
        },
      });
    } catch (error) {
      console.error("İstatistikler getirilirken hata:", error);
      res.status(500).json({
        success: false,
        message: "İstatistikler getirilirken hata oluştu",
      });
    }
  }
);

// Admin: Geri bildirim detayını getir
router.get(
  "/admin/:id",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const feedback = await Feedback.findById(id)
        .populate({
          path: "producer",
          select: "companyName user",
          populate: {
            path: "user",
            select: "firstName lastName email",
          },
        })
        .populate("respondedBy", "firstName lastName");

      if (!feedback) {
        return res.status(404).json({
          success: false,
          message: "Geri bildirim bulunamadı",
        });
      }

      res.json({
        success: true,
        data: feedback,
      });
    } catch (error) {
      console.error("Admin geri bildirim detayı getirilirken hata:", error);
      res.status(500).json({
        success: false,
        message: "Geri bildirim detayı getirilirken hata oluştu",
      });
    }
  }
);

// Admin: Geri bildirime yanıt ver
router.put(
  "/admin/:id/respond",
  authenticateToken,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { adminResponse, status } = req.body;

      if (!adminResponse) {
        return res.status(400).json({
          success: false,
          message: "Admin yanıtı gerekli",
        });
      }

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Kullanıcı bilgisi bulunamadı",
        });
      }

      const feedback = await Feedback.findByIdAndUpdate(
        id,
        {
          adminResponse,
          adminResponseDate: new Date(),
          respondedBy: req.user.id,
          status: status || "in-progress",
        },
        { new: true, runValidators: true }
      );

      if (!feedback) {
        return res.status(404).json({
          success: false,
          message: "Geri bildirim bulunamadı",
        });
      }

      res.json({
        success: true,
        data: feedback,
        message: "Yanıt başarıyla gönderildi",
      });
    } catch (error) {
      console.error("Admin yanıtı gönderilirken hata:", error);
      res.status(500).json({
        success: false,
        message: "Yanıt gönderilirken hata oluştu",
      });
    }
  }
);

// Admin: Geri bildirim durumunu güncelle
router.put(
  "/admin/:id/status",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          message: "Durum gerekli",
        });
      }

      const feedback = await Feedback.findByIdAndUpdate(
        id,
        { status },
        { new: true, runValidators: true }
      );

      if (!feedback) {
        return res.status(404).json({
          success: false,
          message: "Geri bildirim bulunamadı",
        });
      }

      res.json({
        success: true,
        data: feedback,
        message: "Durum başarıyla güncellendi",
      });
    } catch (error) {
      console.error("Geri bildirim durumu güncellenirken hata:", error);
      res.status(500).json({
        success: false,
        message: "Durum güncellenirken hata oluştu",
      });
    }
  }
);

export default router;
