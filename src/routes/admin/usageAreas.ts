import express, { Request, Response } from "express";
import { authenticateToken } from "../../middleware/auth";
import { requireAdmin } from "../../middleware/roleAuth";
import { UsageArea } from "../../models";

interface AuthRequest extends Request {
  user?: any;
}

const router = express.Router();

// Middleware to ensure admin access
router.use(authenticateToken);
router.use(requireAdmin);

// GET all usage areas
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const usageAreas = await UsageArea.find()
      .sort({ order: 1, name: 1 })
      .select("-__v");

    res.json({
      success: true,
      data: usageAreas,
    });
  } catch (error) {
    console.error("Error fetching usage areas:", error);
    res.status(500).json({
      success: false,
      message: "Kullanım alanları getirilemedi",
    });
  }
});

// POST create new usage area
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, order } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Kullanım alanı adı gereklidir",
      });
    }

    // Check if usage area already exists
    const existingUsageArea = await UsageArea.findOne({ name });
    if (existingUsageArea) {
      return res.status(400).json({
        success: false,
        message: "Bu kullanım alanı zaten mevcut",
      });
    }

    const usageArea = new UsageArea({
      name,
      description,
      order: order || 0,
      isActive: true,
    });

    await usageArea.save();

    res.status(201).json({
      success: true,
      message: "Kullanım alanı başarıyla oluşturuldu",
      data: usageArea,
    });
  } catch (error) {
    console.error("Error creating usage area:", error);
    res.status(500).json({
      success: false,
      message: "Kullanım alanı oluşturulamadı",
    });
  }
});

// PUT update usage area
router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, order, isActive } = req.body;

    const usageArea = await UsageArea.findById(id);
    if (!usageArea) {
      return res.status(404).json({
        success: false,
        message: "Kullanım alanı bulunamadı",
      });
    }

    // Check if name is being changed and if it already exists
    if (name && name !== usageArea.name) {
      const existingUsageArea = await UsageArea.findOne({ name });
      if (existingUsageArea) {
        return res.status(400).json({
          success: false,
          message: "Bu kullanım alanı adı zaten kullanılıyor",
        });
      }
    }

    // Update fields
    if (name !== undefined) usageArea.name = name;
    if (description !== undefined) usageArea.description = description;
    if (order !== undefined) usageArea.order = order;
    if (isActive !== undefined) usageArea.isActive = isActive;

    await usageArea.save();

    res.json({
      success: true,
      message: "Kullanım alanı başarıyla güncellendi",
      data: usageArea,
    });
  } catch (error) {
    console.error("Error updating usage area:", error);
    res.status(500).json({
      success: false,
      message: "Kullanım alanı güncellenemedi",
    });
  }
});

// DELETE usage area
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const usageArea = await UsageArea.findById(id);
    if (!usageArea) {
      return res.status(404).json({
        success: false,
        message: "Kullanım alanı bulunamadı",
      });
    }

    await UsageArea.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Kullanım alanı başarıyla silindi",
    });
  } catch (error) {
    console.error("Error deleting usage area:", error);
    res.status(500).json({
      success: false,
      message: "Kullanım alanı silinemedi",
    });
  }
});

export default router;
