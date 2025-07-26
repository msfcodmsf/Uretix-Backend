import express from "express";
import { authenticateToken } from "../../middleware/auth";
import { requireAdmin } from "../../middleware/roleAuth";
import { ProductionCategory } from "../../models";

const router = express.Router();

// Middleware to ensure admin access
router.use(authenticateToken);
router.use(requireAdmin);

// GET all production categories with optional filtering
router.get("/production-categories", async (req, res) => {
  try {
    const { type, vitrinCategory } = req.query;
    let filter: any = {};

    if (type) {
      filter.type = type;
    }

    if (vitrinCategory && type === "vitrin") {
      filter.vitrinCategory = vitrinCategory;
    }

    const categories = await ProductionCategory.find(filter).sort({
      createdAt: -1,
    });
    res.json(categories);
  } catch (error) {
    console.error("Kategoriler getirilirken hata:", error);
    res.status(500).json({ message: "Kategoriler getirilemedi" });
  }
});

// POST create new production category
router.post("/production-categories", async (req, res) => {
  try {
    const { name, type, vitrinCategory } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: "Kategori adı gereklidir" });
    }

    if (!type) {
      return res.status(400).json({ message: "Kategori türü gereklidir" });
    }

    if (type === "vitrin" && !vitrinCategory) {
      return res.status(400).json({
        message: "Vitrin kategorisi için alt kategori seçimi gereklidir",
      });
    }

    // Check for existing category with same name and type
    const existingCategory = await ProductionCategory.findOne({
      name: name.trim(),
      type: type,
    });

    if (existingCategory) {
      return res
        .status(400)
        .json({ message: "Bu isimde bir kategori zaten mevcut" });
    }

    const categoryData: any = {
      name: name.trim(),
      type: type,
      isActive: true,
    };

    if (type === "vitrin" && vitrinCategory) {
      categoryData.vitrinCategory = vitrinCategory;
    }

    try {
      const category = new ProductionCategory(categoryData);
      await category.save();
      res.status(201).json(category);
    } catch (saveError: any) {
      if (saveError.code === 11000) {
        // Duplicate key error
        return res
          .status(400)
          .json({ message: "Bu isimde bir kategori zaten mevcut" });
      }
      throw saveError;
    }
  } catch (error) {
    console.error("Kategori oluşturulurken hata:", error);
    res.status(500).json({ message: "Kategori oluşturulamadı" });
  }
});

// PUT update production category
router.put("/production-categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, vitrinCategory, isActive } = req.body;

    const category = await ProductionCategory.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Kategori bulunamadı" });
    }

    if (name && name.trim().length > 0) {
      // Check for existing category with same name and type
      const existingCategory = await ProductionCategory.findOne({
        name: name.trim(),
        type: type || category.type,
        _id: { $ne: id },
      });

      if (existingCategory) {
        return res
          .status(400)
          .json({ message: "Bu isimde bir kategori zaten mevcut" });
      }
      category.name = name.trim();
    }

    if (type) {
      category.type = type;
    }

    if (type === "vitrin" && vitrinCategory) {
      category.vitrinCategory = vitrinCategory;
    } else if (type !== "vitrin") {
      category.vitrinCategory = undefined;
    }

    if (typeof isActive === "boolean") {
      category.isActive = isActive;
    }

    await category.save();
    res.json(category);
  } catch (error) {
    console.error("Kategori güncellenirken hata:", error);
    res.status(500).json({ message: "Kategori güncellenemedi" });
  }
});

// DELETE production category (hard delete)
router.delete("/production-categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const category = await ProductionCategory.findByIdAndDelete(id);

    if (!category) {
      return res.status(404).json({ message: "Kategori bulunamadı" });
    }

    res.json({ message: "Kategori başarıyla silindi" });
  } catch (error) {
    console.error("Kategori silinirken hata:", error);
    res.status(500).json({ message: "Kategori silinemedi" });
  }
});

export default router;
