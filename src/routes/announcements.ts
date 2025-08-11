import express, { Request, Response } from "express";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import Announcement from "../models/Announcement";
import { AuthRequest } from "../types/auth";

const router = express.Router();

// Admin: Tüm duyuruları getir
router.get(
  "/admin",
  authenticateToken,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const announcements = await Announcement.find()
        .populate("createdBy", "firstName lastName email")
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        data: announcements,
      });
    } catch (error) {
      console.error("Duyurular getirilirken hata:", error);
      res.status(500).json({
        success: false,
        message: "Duyurular getirilirken hata oluştu",
      });
    }
  }
);

// Admin: Yeni duyuru oluştur
router.post(
  "/admin",
  authenticateToken,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { title, content, type, priority, startDate, endDate } = req.body;

      if (!title || !content) {
        return res.status(400).json({
          success: false,
          message: "Başlık ve içerik gerekli",
        });
      }

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: "Kullanıcı bilgisi bulunamadı",
        });
      }

      const announcement = new Announcement({
        title,
        content,
        type: type || "info",
        priority: priority || "medium",
        startDate: startDate || new Date(),
        endDate,
        createdBy: req.user.id,
      });

      await announcement.save();

      res.status(201).json({
        success: true,
        data: announcement,
        message: "Duyuru başarıyla oluşturuldu",
      });
    } catch (error) {
      console.error("Duyuru oluşturulurken hata:", error);
      res.status(500).json({
        success: false,
        message: "Duyuru oluşturulurken hata oluştu",
      });
    }
  }
);

// Admin: Duyuru güncelle
router.put(
  "/admin/:id",
  authenticateToken,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const announcement = await Announcement.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!announcement) {
        return res.status(404).json({
          success: false,
          message: "Duyuru bulunamadı",
        });
      }

      res.json({
        success: true,
        data: announcement,
        message: "Duyuru başarıyla güncellendi",
      });
    } catch (error) {
      console.error("Duyuru güncellenirken hata:", error);
      res.status(500).json({
        success: false,
        message: "Duyuru güncellenirken hata oluştu",
      });
    }
  }
);

// Admin: Duyuru sil
router.delete(
  "/admin/:id",
  authenticateToken,
  requireAdmin,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const announcement = await Announcement.findByIdAndDelete(id);

      if (!announcement) {
        return res.status(404).json({
          success: false,
          message: "Duyuru bulunamadı",
        });
      }

      res.json({
        success: true,
        message: "Duyuru başarıyla silindi",
      });
    } catch (error) {
      console.error("Duyuru silinirken hata:", error);
      res.status(500).json({
        success: false,
        message: "Duyuru silinirken hata oluştu",
      });
    }
  }
);

// Üreticiler için: Aktif duyuruları getir
router.get("/active", async (req: Request, res: Response) => {
  try {
    const now = new Date();

    const announcements = await Announcement.find({
      isActive: true,
      startDate: { $lte: now },
      $or: [{ endDate: { $exists: false } }, { endDate: { $gte: now } }],
    })
      .select("title content type priority createdAt")
      .sort({ priority: -1, createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: announcements,
    });
  } catch (error) {
    console.error("Aktif duyurular getirilirken hata:", error);
    res.status(500).json({
      success: false,
      message: "Duyurular getirilirken hata oluştu",
    });
  }
});

export default router;
