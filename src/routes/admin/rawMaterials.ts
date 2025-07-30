import express, { Request, Response } from "express";
import { authenticateToken } from "../../middleware/auth";
import { requireAdmin } from "../../middleware/roleAuth";
import { RawMaterial } from "../../models";

interface AuthRequest extends Request {
  user?: any;
}

const router = express.Router();

// Middleware to ensure admin access
router.use(authenticateToken);
router.use(requireAdmin);

// GET all raw materials
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const rawMaterials = await RawMaterial.find()
      .sort({ order: 1, name: 1 })
      .select("-__v");

    res.json({
      success: true,
      data: rawMaterials,
    });
  } catch (error) {
    console.error("Error fetching raw materials:", error);
    res.status(500).json({
      success: false,
      message: "Hammadde kategorileri getirilemedi",
    });
  }
});

// POST create new raw material
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, order } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Hammadde adı gereklidir",
      });
    }

    // Check if raw material already exists
    const existingRawMaterial = await RawMaterial.findOne({ name });
    if (existingRawMaterial) {
      return res.status(400).json({
        success: false,
        message: "Bu hammadde zaten mevcut",
      });
    }

    const rawMaterial = new RawMaterial({
      name,
      description,
      order: order || 0,
      isActive: true,
    });

    await rawMaterial.save();

    res.status(201).json({
      success: true,
      message: "Hammadde başarıyla oluşturuldu",
      data: rawMaterial,
    });
  } catch (error) {
    console.error("Error creating raw material:", error);
    res.status(500).json({
      success: false,
      message: "Hammadde oluşturulamadı",
    });
  }
});

// PUT update raw material
router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, order, isActive } = req.body;

    const rawMaterial = await RawMaterial.findById(id);
    if (!rawMaterial) {
      return res.status(404).json({
        success: false,
        message: "Hammadde bulunamadı",
      });
    }

    // Check if name is being changed and if it already exists
    if (name && name !== rawMaterial.name) {
      const existingRawMaterial = await RawMaterial.findOne({ name });
      if (existingRawMaterial) {
        return res.status(400).json({
          success: false,
          message: "Bu hammadde adı zaten kullanılıyor",
        });
      }
    }

    // Update fields
    if (name !== undefined) rawMaterial.name = name;
    if (description !== undefined) rawMaterial.description = description;
    if (order !== undefined) rawMaterial.order = order;
    if (isActive !== undefined) rawMaterial.isActive = isActive;

    await rawMaterial.save();

    res.json({
      success: true,
      message: "Hammadde başarıyla güncellendi",
      data: rawMaterial,
    });
  } catch (error) {
    console.error("Error updating raw material:", error);
    res.status(500).json({
      success: false,
      message: "Hammadde güncellenemedi",
    });
  }
});

// DELETE raw material
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const rawMaterial = await RawMaterial.findById(id);
    if (!rawMaterial) {
      return res.status(404).json({
        success: false,
        message: "Hammadde bulunamadı",
      });
    }

    await RawMaterial.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Hammadde başarıyla silindi",
    });
  } catch (error) {
    console.error("Error deleting raw material:", error);
    res.status(500).json({
      success: false,
      message: "Hammadde silinemedi",
    });
  }
});

export default router;
