import express, { Request, Response } from "express";
import { authenticateToken } from "../../middleware/auth";
import { requireAdmin } from "../../middleware/roleAuth";
import { ProductionMethod } from "../../models";

interface AuthRequest extends Request {
  user?: any;
}

const router = express.Router();

// Middleware to ensure admin access
router.use(authenticateToken);
router.use(requireAdmin);

// GET all production methods
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const productionMethods = await ProductionMethod.find()
      .sort({ order: 1, name: 1 })
      .select("-__v");

    res.json({
      success: true,
      data: productionMethods,
    });
  } catch (error) {
    console.error("Error fetching production methods:", error);
    res.status(500).json({
      success: false,
      message: "Üretim yöntemi kategorileri getirilemedi",
    });
  }
});

// POST create new production method
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, order } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Üretim yöntemi adı gereklidir",
      });
    }

    // Check if production method already exists
    const existingProductionMethod = await ProductionMethod.findOne({ name });
    if (existingProductionMethod) {
      return res.status(400).json({
        success: false,
        message: "Bu üretim yöntemi zaten mevcut",
      });
    }

    const productionMethod = new ProductionMethod({
      name,
      description,
      order: order || 0,
      isActive: true,
    });

    await productionMethod.save();

    res.status(201).json({
      success: true,
      message: "Üretim yöntemi başarıyla oluşturuldu",
      data: productionMethod,
    });
  } catch (error) {
    console.error("Error creating production method:", error);
    res.status(500).json({
      success: false,
      message: "Üretim yöntemi oluşturulamadı",
    });
  }
});

// PUT update production method
router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, order, isActive } = req.body;

    const productionMethod = await ProductionMethod.findById(id);
    if (!productionMethod) {
      return res.status(404).json({
        success: false,
        message: "Üretim yöntemi bulunamadı",
      });
    }

    // Check if name is being changed and if it already exists
    if (name && name !== productionMethod.name) {
      const existingProductionMethod = await ProductionMethod.findOne({ name });
      if (existingProductionMethod) {
        return res.status(400).json({
          success: false,
          message: "Bu üretim yöntemi adı zaten kullanılıyor",
        });
      }
    }

    // Update fields
    if (name !== undefined) productionMethod.name = name;
    if (description !== undefined) productionMethod.description = description;
    if (order !== undefined) productionMethod.order = order;
    if (isActive !== undefined) productionMethod.isActive = isActive;

    await productionMethod.save();

    res.json({
      success: true,
      message: "Üretim yöntemi başarıyla güncellendi",
      data: productionMethod,
    });
  } catch (error) {
    console.error("Error updating production method:", error);
    res.status(500).json({
      success: false,
      message: "Üretim yöntemi güncellenemedi",
    });
  }
});

// DELETE production method
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const productionMethod = await ProductionMethod.findById(id);
    if (!productionMethod) {
      return res.status(404).json({
        success: false,
        message: "Üretim yöntemi bulunamadı",
      });
    }

    await ProductionMethod.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Üretim yöntemi başarıyla silindi",
    });
  } catch (error) {
    console.error("Error deleting production method:", error);
    res.status(500).json({
      success: false,
      message: "Üretim yöntemi silinemedi",
    });
  }
});

export default router;
