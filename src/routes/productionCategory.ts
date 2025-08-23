import express from "express";
import ProductionCategory from "../models/ProductionCategory.model";
import { authenticateToken } from "../middleware/auth";

const router = express.Router();

// Tüm üretim kategorilerini getir
router.get("/", async (req, res) => {
  try {
    const categories = await ProductionCategory.find({ isActive: true }).sort({
      name: 1,
    });
    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching production categories:", error);
    res.status(500).json({
      success: false,
      message: "Kategoriler yüklenirken hata oluştu",
    });
  }
});

// Tip bazında kategorileri getir
router.get("/type/:type", async (req, res) => {
  try {
    const { type } = req.params;
    const categories = await ProductionCategory.find({
      type,
      isActive: true,
    }).sort({ name: 1 });
    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching production categories by type:", error);
    res.status(500).json({
      success: false,
      message: "Kategoriler yüklenirken hata oluştu",
    });
  }
});

// Ürün tipi bazında kategorileri getir (bitmiş ürün veya yarı mamül)
router.get("/product-type/:productType", async (req, res) => {
  try {
    const { productType } = req.params;

    // productType parametresini kontrol et
    if (!["bitmis_urun", "yari_mamul"].includes(productType)) {
      return res.status(400).json({
        success: false,
        message:
          "Geçersiz ürün tipi. 'bitmis_urun' veya 'yari_mamul' olmalıdır.",
      });
    }

    const categories = await ProductionCategory.find({
      productType,
      isActive: true,
    }).sort({ name: 1 });

    res.json({
      success: true,
      data: categories,
      count: categories.length,
    });
  } catch (error) {
    console.error(
      "Error fetching production categories by product type:",
      error
    );
    res.status(500).json({
      success: false,
      message: "Kategoriler yüklenirken hata oluştu",
    });
  }
});

// Tüm ürün tiplerini getir (bitmiş ürün ve yarı mamül)
router.get("/product-types/all", async (req, res) => {
  try {
    const categories = await ProductionCategory.find({
      productType: { $exists: true, $ne: null },
      isActive: true,
    }).sort({ productType: 1, name: 1 });

    // Ürün tipine göre grupla
    const groupedCategories = {
      bitmis_urun: categories.filter(
        (cat) => cat.productType === "bitmis_urun"
      ),
      yari_mamul: categories.filter((cat) => cat.productType === "yari_mamul"),
    };

    res.json({
      success: true,
      data: groupedCategories,
      totalCount: categories.length,
      bitmisUrunCount: groupedCategories.bitmis_urun.length,
      yariMamulCount: groupedCategories.yari_mamul.length,
    });
  } catch (error) {
    console.error("Error fetching all product types:", error);
    res.status(500).json({
      success: false,
      message: "Kategoriler yüklenirken hata oluştu",
    });
  }
});

// Yeni kategori oluştur (Admin only)
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { name, description, type } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: "İsim ve tip alanları zorunludur",
      });
    }

    const existingCategory = await ProductionCategory.findOne({
      name,
      type,
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Bu isimde bir kategori zaten mevcut",
      });
    }

    const newCategory = new ProductionCategory({
      name,
      description,
      type,
    });

    await newCategory.save();

    res.status(201).json({
      success: true,
      data: newCategory,
      message: "Kategori başarıyla oluşturuldu",
    });
  } catch (error) {
    console.error("Error creating production category:", error);
    res.status(500).json({
      success: false,
      message: "Kategori oluşturulurken hata oluştu",
    });
  }
});

// Kategori güncelle (Admin only)
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, type, isActive } = req.body;

    const category = await ProductionCategory.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Kategori bulunamadı",
      });
    }

    if (name) category.name = name;
    if (description !== undefined) category.description = description;
    if (type) category.type = type;
    if (isActive !== undefined) category.isActive = isActive;

    await category.save();

    res.json({
      success: true,
      data: category,
      message: "Kategori başarıyla güncellendi",
    });
  } catch (error) {
    console.error("Error updating production category:", error);
    res.status(500).json({
      success: false,
      message: "Kategori güncellenirken hata oluştu",
    });
  }
});

// Kategori sil (Admin only)
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const category = await ProductionCategory.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Kategori bulunamadı",
      });
    }

    await ProductionCategory.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Kategori başarıyla silindi",
    });
  } catch (error) {
    console.error("Error deleting production category:", error);
    res.status(500).json({
      success: false,
      message: "Kategori silinirken hata oluştu",
    });
  }
});

export default router;
