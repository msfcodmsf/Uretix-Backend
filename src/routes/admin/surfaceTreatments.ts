import express from "express";
import { SurfaceTreatment } from "../../models";
import { authenticateToken } from "../../middleware/auth";
import { requireRole } from "../../middleware/roleAuth";

const router = express.Router();

// GET all surface treatments
router.get(
  "/",
  authenticateToken,
  requireRole(["admin", "superadmin"]),
  async (req, res) => {
    try {
      const surfaceTreatments = await SurfaceTreatment.find({ isActive: true })
        .sort({ order: 1, name: 1 })
        .lean();

      res.json({
        success: true,
        data: surfaceTreatments,
      });
    } catch (error) {
      console.error("Yüzey işlemleri getirilirken hata:", error);
      res.status(500).json({
        success: false,
        message: "Yüzey işlemleri getirilemedi",
      });
    }
  }
);

// POST create surface treatment
router.post(
  "/",
  authenticateToken,
  requireRole(["admin", "superadmin"]),
  async (req, res) => {
    try {
      const { name, description, order } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Yüzey işlemi adı gereklidir",
        });
      }

      // Check for existing surface treatment with same name
      const existingSurfaceTreatment = await SurfaceTreatment.findOne({
        name: name.trim(),
        isActive: true,
      });

      if (existingSurfaceTreatment) {
        return res.status(400).json({
          success: false,
          message: "Bu isimde bir yüzey işlemi zaten mevcut",
        });
      }

      const surfaceTreatment = new SurfaceTreatment({
        name: name.trim(),
        description: description?.trim() || "",
        order: order || 0,
        isActive: true,
      });

      await surfaceTreatment.save();

      res.status(201).json({
        success: true,
        data: surfaceTreatment,
        message: "Yüzey işlemi başarıyla oluşturuldu",
      });
    } catch (error) {
      console.error("Yüzey işlemi oluşturulurken hata:", error);
      res.status(500).json({
        success: false,
        message: "Yüzey işlemi oluşturulamadı",
      });
    }
  }
);

// PUT update surface treatment
router.put(
  "/:id",
  authenticateToken,
  requireRole(["admin", "superadmin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { name, description, order, isActive } = req.body;

      const surfaceTreatment = await SurfaceTreatment.findById(id);
      if (!surfaceTreatment) {
        return res.status(404).json({
          success: false,
          message: "Yüzey işlemi bulunamadı",
        });
      }

      if (name && name.trim().length > 0) {
        // Check for existing surface treatment with same name
        const existingSurfaceTreatment = await SurfaceTreatment.findOne({
          name: name.trim(),
          isActive: true,
          _id: { $ne: id },
        });

        if (existingSurfaceTreatment) {
          return res.status(400).json({
            success: false,
            message: "Bu isimde bir yüzey işlemi zaten mevcut",
          });
        }
        surfaceTreatment.name = name.trim();
      }

      if (description !== undefined) {
        surfaceTreatment.description = description?.trim() || "";
      }

      if (order !== undefined) {
        surfaceTreatment.order = order;
      }

      if (typeof isActive === "boolean") {
        surfaceTreatment.isActive = isActive;
      }

      await surfaceTreatment.save();

      res.json({
        success: true,
        data: surfaceTreatment,
        message: "Yüzey işlemi başarıyla güncellendi",
      });
    } catch (error) {
      console.error("Yüzey işlemi güncellenirken hata:", error);
      res.status(500).json({
        success: false,
        message: "Yüzey işlemi güncellenemedi",
      });
    }
  }
);

// DELETE surface treatment
router.delete(
  "/:id",
  authenticateToken,
  requireRole(["admin", "superadmin"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      const surfaceTreatment = await SurfaceTreatment.findByIdAndDelete(id);
      if (!surfaceTreatment) {
        return res.status(404).json({
          success: false,
          message: "Yüzey işlemi bulunamadı",
        });
      }

      res.json({
        success: true,
        message: "Yüzey işlemi başarıyla silindi",
      });
    } catch (error) {
      console.error("Yüzey işlemi silinirken hata:", error);
      res.status(500).json({
        success: false,
        message: "Yüzey işlemi silinemedi",
      });
    }
  }
);

// DELETE all surface treatments (Admin and Super Admin only)
router.delete(
  "/delete-all",
  authenticateToken,
  requireRole(["admin", "superadmin"]),
  async (req, res) => {
    try {
      const result = await SurfaceTreatment.deleteMany({});

      res.json({
        success: true,
        message: `Tüm yüzey işlemleri başarıyla silindi. Silinen işlem sayısı: ${result.deletedCount}`,
        deletedCount: result.deletedCount,
      });
    } catch (error) {
      console.error("Tüm yüzey işlemleri silinirken hata:", error);
      res.status(500).json({
        success: false,
        message: "Yüzey işlemleri silinirken hata oluştu",
      });
    }
  }
);

export default router;
