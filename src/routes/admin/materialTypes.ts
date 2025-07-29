import express, { Request, Response } from "express";
import { authenticateToken } from "../../middleware/auth";
import { requireAdmin } from "../../middleware/roleAuth";
import { MaterialType } from "../../models";

interface AuthRequest extends Request {
  user?: any;
}

const router = express.Router();

// Middleware to ensure admin access
router.use(authenticateToken);
router.use(requireAdmin);

// GET all material types
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const materialTypes = await MaterialType.find()
      .sort({ order: 1, name: 1 })
      .select("-__v");

    res.json({
      success: true,
      data: materialTypes,
    });
  } catch (error) {
    console.error("Error fetching material types:", error);
    res.status(500).json({
      success: false,
      message: "Malzeme tipleri getirilemedi",
    });
  }
});

// POST create new material type
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, order } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Malzeme tipi adı gereklidir",
      });
    }

    // Check if material type already exists
    const existingMaterialType = await MaterialType.findOne({ name });
    if (existingMaterialType) {
      return res.status(400).json({
        success: false,
        message: "Bu malzeme tipi zaten mevcut",
      });
    }

    const materialType = new MaterialType({
      name,
      description,
      order: order || 0,
      isActive: true,
    });

    await materialType.save();

    res.status(201).json({
      success: true,
      message: "Malzeme tipi başarıyla oluşturuldu",
      data: materialType,
    });
  } catch (error) {
    console.error("Error creating material type:", error);
    res.status(500).json({
      success: false,
      message: "Malzeme tipi oluşturulamadı",
    });
  }
});

// PUT update material type
router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, order, isActive } = req.body;

    const materialType = await MaterialType.findById(id);
    if (!materialType) {
      return res.status(404).json({
        success: false,
        message: "Malzeme tipi bulunamadı",
      });
    }

    // Check if name is being changed and if it already exists
    if (name && name !== materialType.name) {
      const existingMaterialType = await MaterialType.findOne({ name });
      if (existingMaterialType) {
        return res.status(400).json({
          success: false,
          message: "Bu malzeme tipi adı zaten kullanılıyor",
        });
      }
    }

    // Update fields
    if (name !== undefined) materialType.name = name;
    if (description !== undefined) materialType.description = description;
    if (order !== undefined) materialType.order = order;
    if (isActive !== undefined) materialType.isActive = isActive;

    await materialType.save();

    res.json({
      success: true,
      message: "Malzeme tipi başarıyla güncellendi",
      data: materialType,
    });
  } catch (error) {
    console.error("Error updating material type:", error);
    res.status(500).json({
      success: false,
      message: "Malzeme tipi güncellenemedi",
    });
  }
});

// DELETE material type
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const materialType = await MaterialType.findById(id);
    if (!materialType) {
      return res.status(404).json({
        success: false,
        message: "Malzeme tipi bulunamadı",
      });
    }

    await MaterialType.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Malzeme tipi başarıyla silindi",
    });
  } catch (error) {
    console.error("Error deleting material type:", error);
    res.status(500).json({
      success: false,
      message: "Malzeme tipi silinemedi",
    });
  }
});

export default router;
