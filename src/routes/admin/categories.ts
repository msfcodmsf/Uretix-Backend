import express from "express";
import { authenticateToken } from "../../middleware/auth";
import { requireAdmin } from "../../middleware/roleAuth";
import {
  ProductionCategory,
  InterestCategory,
  ServiceSector,
} from "../../models";

const router = express.Router();

// Middleware to ensure admin access
router.use(authenticateToken);
router.use(requireAdmin);

// GET all production categories with optional filtering
router.get("/production-categories", async (req, res) => {
  try {
    const { type, vitrinCategory, parentCategory } = req.query;
    let filter: any = {};

    if (type) {
      filter.type = type;
    }

    if (vitrinCategory && type === "vitrin") {
      filter.vitrinCategory = vitrinCategory;
    }

    // Alt kategori filtreleme
    if (parentCategory) {
      filter.parentCategory = parentCategory;
    } else if (vitrinCategory === "uretim" && type === "vitrin") {
      // Üretim kategorilerinde sadece ana kategorileri getir (parentCategory olmayan)
      filter.parentCategory = { $exists: false };
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

// GET subcategories for a specific parent category
router.get(
  "/production-categories/:parentId/subcategories",
  async (req, res) => {
    try {
      const { parentId } = req.params;

      const subcategories = await ProductionCategory.find({
        parentCategory: parentId,
        type: "vitrin",
        vitrinCategory: "uretim",
      }).sort({ name: 1 });

      res.json(subcategories);
    } catch (error) {
      console.error("Alt kategoriler getirilirken hata:", error);
      res.status(500).json({ message: "Alt kategoriler getirilemedi" });
    }
  }
);

// GET all interest categories
router.get("/interest-categories", async (req, res) => {
  try {
    const { search, isActive } = req.query;
    let filter: any = {};

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const categories = await InterestCategory.find(filter)
      .sort({ order: 1, name: 1 })
      .select("-__v");

    res.json(categories);
  } catch (error) {
    console.error("İlgi alanları kategorileri getirilirken hata:", error);
    res
      .status(500)
      .json({ message: "İlgi alanları kategorileri getirilemedi" });
  }
});

// POST create new interest category
router.post("/interest-categories", async (req, res) => {
  try {
    const { name, description, icon, color, order } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: "Kategori adı gereklidir" });
    }

    // Check for existing category with same name
    const existingCategory = await InterestCategory.findOne({
      name: name.trim(),
    });

    if (existingCategory) {
      return res
        .status(400)
        .json({ message: "Bu isimde bir ilgi alanı kategorisi zaten mevcut" });
    }

    const categoryData: any = {
      name: name.trim(),
      isActive: true,
    };

    if (description) categoryData.description = description.trim();
    if (icon) categoryData.icon = icon.trim();
    if (color) categoryData.color = color.trim();
    if (order !== undefined) categoryData.order = Number(order);

    const category = new InterestCategory(categoryData);
    await category.save();

    res.status(201).json(category);
  } catch (error) {
    console.error("İlgi alanı kategorisi oluşturulurken hata:", error);
    res.status(500).json({ message: "İlgi alanı kategorisi oluşturulamadı" });
  }
});

// PUT update interest category
router.put("/interest-categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, color, isActive, order } = req.body;

    const category = await InterestCategory.findById(id);
    if (!category) {
      return res
        .status(404)
        .json({ message: "İlgi alanı kategorisi bulunamadı" });
    }

    if (name && name.trim().length > 0) {
      // Check for existing category with same name
      const existingCategory = await InterestCategory.findOne({
        name: name.trim(),
        _id: { $ne: id },
      });

      if (existingCategory) {
        return res.status(400).json({
          message: "Bu isimde bir ilgi alanı kategorisi zaten mevcut",
        });
      }
      category.name = name.trim();
    }

    if (description !== undefined) category.description = description.trim();
    if (icon !== undefined) category.icon = icon.trim();
    if (color !== undefined) category.color = color.trim();
    if (typeof isActive === "boolean") category.isActive = isActive;
    if (order !== undefined) category.order = Number(order);

    await category.save();
    res.json(category);
  } catch (error) {
    console.error("İlgi alanı kategorisi güncellenirken hata:", error);
    res.status(500).json({ message: "İlgi alanı kategorisi güncellenemedi" });
  }
});

// DELETE interest category (soft delete by setting isActive to false)
router.delete("/interest-categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const category = await InterestCategory.findById(id);

    if (!category) {
      return res
        .status(404)
        .json({ message: "İlgi alanı kategorisi bulunamadı" });
    }

    // Soft delete - set isActive to false instead of hard delete
    category.isActive = false;
    await category.save();

    res.json({ message: "İlgi alanı kategorisi başarıyla silindi" });
  } catch (error) {
    console.error("İlgi alanı kategorisi silinirken hata:", error);
    res.status(500).json({ message: "İlgi alanı kategorisi silinemedi" });
  }
});

// ===== SERVICE SECTORS ENDPOINTS =====

// GET all service sectors
router.get("/service-sectors", async (req, res) => {
  try {
    const { search, isActive } = req.query;
    let filter: any = {};

    if (isActive !== undefined) {
      filter.isActive = isActive === "true";
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const sectors = await ServiceSector.find(filter)
      .sort({ order: 1, name: 1 })
      .select("-__v");

    res.json(sectors);
  } catch (error) {
    console.error("Hizmet sektörleri getirilirken hata:", error);
    res.status(500).json({ message: "Hizmet sektörleri getirilemedi" });
  }
});

// POST create new service sector
router.post("/service-sectors", async (req, res) => {
  try {
    const { name, description, icon, color, order } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ message: "Sektör adı gereklidir" });
    }

    // Check for existing sector with same name
    const existingSector = await ServiceSector.findOne({
      name: name.trim(),
    });

    if (existingSector) {
      return res
        .status(400)
        .json({ message: "Bu isimde bir hizmet sektörü zaten mevcut" });
    }

    const sectorData: any = {
      name: name.trim(),
      isActive: true,
    };

    if (description) sectorData.description = description.trim();
    if (icon) sectorData.icon = icon.trim();
    if (color) sectorData.color = color.trim();
    if (order !== undefined) sectorData.order = Number(order);

    const sector = new ServiceSector(sectorData);
    await sector.save();

    res.status(201).json(sector);
  } catch (error) {
    console.error("Hizmet sektörü oluşturulurken hata:", error);
    res.status(500).json({ message: "Hizmet sektörü oluşturulamadı" });
  }
});

// PUT update service sector
router.put("/service-sectors/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, color, isActive, order } = req.body;

    const sector = await ServiceSector.findById(id);
    if (!sector) {
      return res.status(404).json({ message: "Hizmet sektörü bulunamadı" });
    }

    if (name && name.trim().length > 0) {
      // Check for existing sector with same name
      const existingSector = await ServiceSector.findOne({
        name: name.trim(),
        _id: { $ne: id },
      });

      if (existingSector) {
        return res.status(400).json({
          message: "Bu isimde bir hizmet sektörü zaten mevcut",
        });
      }
      sector.name = name.trim();
    }

    if (description !== undefined) sector.description = description.trim();
    if (icon !== undefined) sector.icon = icon.trim();
    if (color !== undefined) sector.color = color.trim();
    if (typeof isActive === "boolean") sector.isActive = isActive;
    if (order !== undefined) sector.order = Number(order);

    await sector.save();
    res.json(sector);
  } catch (error) {
    console.error("Hizmet sektörü güncellenirken hata:", error);
    res.status(500).json({ message: "Hizmet sektörü güncellenemedi" });
  }
});

// DELETE service sector (soft delete by setting isActive to false)
router.delete("/service-sectors/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const sector = await ServiceSector.findById(id);

    if (!sector) {
      return res.status(404).json({ message: "Hizmet sektörü bulunamadı" });
    }

    // Soft delete - set isActive to false instead of hard delete
    sector.isActive = false;
    await sector.save();

    res.json({ message: "Hizmet sektörü başarıyla silindi" });
  } catch (error) {
    console.error("Hizmet sektörü silinirken hata:", error);
    res.status(500).json({ message: "Hizmet sektörü silinemedi" });
  }
});

// POST create new production category
router.post("/production-categories", async (req, res) => {
  try {
    const { name, type, vitrinCategory, parentCategory } = req.body;

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

    // Alt kategori kontrolü - sadece üretim kategorilerinde alt kategori olabilir
    if (parentCategory && (type !== "vitrin" || vitrinCategory !== "uretim")) {
      return res.status(400).json({
        message: "Alt kategori sadece üretim kategorilerinde oluşturulabilir",
      });
    }

    // Parent kategori kontrolü - sadece parentCategory değeri varsa kontrol et
    if (parentCategory) {
      const parentCat = await ProductionCategory.findById(parentCategory);
      if (!parentCat) {
        return res.status(400).json({ message: "Ana kategori bulunamadı" });
      }
      if (
        parentCat.type !== "vitrin" ||
        parentCat.vitrinCategory !== "uretim"
      ) {
        return res.status(400).json({ message: "Geçersiz ana kategori" });
      }
      // Ana kategorinin kendisinin parent'ı olmaması gerekir
      if (parentCat.parentCategory) {
        return res
          .status(400)
          .json({ message: "Alt kategori alt kategori olamaz" });
      }
    }

    // Check for existing category with same name and type
    const existingCategory = await ProductionCategory.findOne({
      name: name.trim(),
      type: type,
      parentCategory: parentCategory || { $exists: false },
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

    if (parentCategory) {
      categoryData.parentCategory = parentCategory;
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
    const { name, type, vitrinCategory, parentCategory, isActive } = req.body;

    const category = await ProductionCategory.findById(id);
    if (!category) {
      return res.status(404).json({ message: "Kategori bulunamadı" });
    }

    if (name && name.trim().length > 0) {
      // Check for existing category with same name and type
      const existingCategory = await ProductionCategory.findOne({
        name: name.trim(),
        type: type || category.type,
        parentCategory: parentCategory ||
          category.parentCategory || { $exists: false },
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

    if (parentCategory !== undefined) {
      // Alt kategori kontrolü
      if (
        parentCategory &&
        (type !== "vitrin" || vitrinCategory !== "uretim")
      ) {
        return res.status(400).json({
          message: "Alt kategori sadece üretim kategorilerinde oluşturulabilir",
        });
      }

      // Parent kategori kontrolü - sadece parentCategory değeri varsa kontrol et
      if (parentCategory) {
        const parentCat = await ProductionCategory.findById(parentCategory);
        if (!parentCat) {
          return res.status(400).json({ message: "Ana kategori bulunamadı" });
        }
        if (
          parentCat.type !== "vitrin" ||
          parentCat.vitrinCategory !== "uretim"
        ) {
          return res.status(400).json({ message: "Geçersiz ana kategori" });
        }
        // Ana kategorinin kendisinin parent'ı olmaması gerekir
        if (parentCat.parentCategory) {
          return res
            .status(400)
            .json({ message: "Alt kategori alt kategori olamaz" });
        }
      }

      category.parentCategory = parentCategory || undefined;
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
