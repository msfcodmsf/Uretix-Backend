import express, { Request } from "express";
import { authenticateToken } from "../../middleware/auth";
import { validateAdminRole } from "../../middleware/roles";
import { IUser } from "../../models/User.model";
import { ProductionCategory } from "../../models/ProductionCategory.model";
import { SubCategory } from "../../models/SubCategory.model";
import { TaxOffice } from "../../models/TaxOffice.model";
import { Types } from "mongoose";

interface AuthRequest extends Request {
  user?: IUser;
}

const router = express.Router();

// ==================== ANA ÜRETİM KATEGORİLERİ ====================

// Tüm ana kategorileri getir
router.get(
  "/production-categories",
  authenticateToken,
  validateAdminRole,
  async (req: AuthRequest, res) => {
    try {
      const categories = await ProductionCategory.find({ isActive: true })
        .sort({ order: 1, name: 1 })
        .lean();

      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      console.error("Error getting production categories:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get production categories",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Ana kategori oluştur
router.post(
  "/production-categories",
  authenticateToken,
  validateAdminRole,
  async (req: AuthRequest, res) => {
    try {
      const { name, description, order } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message: "Kategori adı gereklidir",
        });
      }

      const existingCategory = await ProductionCategory.findOne({ name });
      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: "Bu kategori adı zaten mevcut",
        });
      }

      const category = new ProductionCategory({
        name,
        description,
        order: order || 0,
      });

      await category.save();

      res.status(201).json({
        success: true,
        message: "Ana kategori başarıyla oluşturuldu",
        data: category,
      });
    } catch (error) {
      console.error("Error creating production category:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create production category",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Ana kategori güncelle
router.put(
  "/production-categories/:id",
  authenticateToken,
  validateAdminRole,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { name, description, isActive, order } = req.body;

      const category = await ProductionCategory.findById(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Kategori bulunamadı",
        });
      }

      if (name && name !== category.name) {
        const existingCategory = await ProductionCategory.findOne({ name });
        if (existingCategory) {
          return res.status(400).json({
            success: false,
            message: "Bu kategori adı zaten mevcut",
          });
        }
      }

      if (name) category.name = name;
      if (description !== undefined) category.description = description;
      if (isActive !== undefined) category.isActive = isActive;
      if (order !== undefined) category.order = order;

      await category.save();

      res.json({
        success: true,
        message: "Ana kategori başarıyla güncellendi",
        data: category,
      });
    } catch (error) {
      console.error("Error updating production category:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update production category",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Ana kategori sil (soft delete)
router.delete(
  "/production-categories/:id",
  authenticateToken,
  validateAdminRole,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const category = await ProductionCategory.findById(id);
      if (!category) {
        return res.status(404).json({
          success: false,
          message: "Kategori bulunamadı",
        });
      }

      category.isActive = false;
      await category.save();

      res.json({
        success: true,
        message: "Ana kategori başarıyla silindi",
      });
    } catch (error) {
      console.error("Error deleting production category:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete production category",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// ==================== ALT KATEGORİLER ====================

// Tüm alt kategorileri getir
router.get(
  "/sub-categories",
  authenticateToken,
  validateAdminRole,
  async (req: AuthRequest, res) => {
    try {
      const { parentCategory } = req.query;

      let query: any = { isActive: true };
      if (parentCategory) {
        query.parentCategory = new Types.ObjectId(parentCategory as string);
      }

      const subCategories = await SubCategory.find(query)
        .populate("parentCategory", "name")
        .sort({ order: 1, name: 1 })
        .lean();

      res.json({
        success: true,
        data: subCategories,
      });
    } catch (error) {
      console.error("Error getting sub categories:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get sub categories",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Alt kategori oluştur
router.post(
  "/sub-categories",
  authenticateToken,
  validateAdminRole,
  async (req: AuthRequest, res) => {
    try {
      const { name, description, parentCategory, order } = req.body;

      if (!name || !parentCategory) {
        return res.status(400).json({
          success: false,
          message: "Kategori adı ve ana kategori gereklidir",
        });
      }

      // Ana kategoriyi kontrol et
      const parentCat = await ProductionCategory.findById(parentCategory);
      if (!parentCat) {
        return res.status(400).json({
          success: false,
          message: "Ana kategori bulunamadı",
        });
      }

      const existingSubCategory = await SubCategory.findOne({
        name,
        parentCategory,
      });
      if (existingSubCategory) {
        return res.status(400).json({
          success: false,
          message: "Bu alt kategori adı zaten mevcut",
        });
      }

      const subCategory = new SubCategory({
        name,
        description,
        parentCategory: new Types.ObjectId(parentCategory),
        order: order || 0,
      });

      await subCategory.save();

      res.status(201).json({
        success: true,
        message: "Alt kategori başarıyla oluşturuldu",
        data: subCategory,
      });
    } catch (error) {
      console.error("Error creating sub category:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create sub category",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Alt kategori güncelle
router.put(
  "/sub-categories/:id",
  authenticateToken,
  validateAdminRole,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { name, description, parentCategory, isActive, order } = req.body;

      const subCategory = await SubCategory.findById(id);
      if (!subCategory) {
        return res.status(404).json({
          success: false,
          message: "Alt kategori bulunamadı",
        });
      }

      if (parentCategory) {
        const parentCat = await ProductionCategory.findById(parentCategory);
        if (!parentCat) {
          return res.status(400).json({
            success: false,
            message: "Ana kategori bulunamadı",
          });
        }
      }

      if (
        name &&
        (name !== subCategory.name ||
          parentCategory !== subCategory.parentCategory.toString())
      ) {
        const existingSubCategory = await SubCategory.findOne({
          name,
          parentCategory: parentCategory || subCategory.parentCategory,
        });
        if (existingSubCategory) {
          return res.status(400).json({
            success: false,
            message: "Bu alt kategori adı zaten mevcut",
          });
        }
      }

      if (name) subCategory.name = name;
      if (description !== undefined) subCategory.description = description;
      if (parentCategory)
        subCategory.parentCategory = new Types.ObjectId(parentCategory);
      if (isActive !== undefined) subCategory.isActive = isActive;
      if (order !== undefined) subCategory.order = order;

      await subCategory.save();

      res.json({
        success: true,
        message: "Alt kategori başarıyla güncellendi",
        data: subCategory,
      });
    } catch (error) {
      console.error("Error updating sub category:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update sub category",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Alt kategori sil (soft delete)
router.delete(
  "/sub-categories/:id",
  authenticateToken,
  validateAdminRole,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const subCategory = await SubCategory.findById(id);
      if (!subCategory) {
        return res.status(404).json({
          success: false,
          message: "Alt kategori bulunamadı",
        });
      }

      subCategory.isActive = false;
      await subCategory.save();

      res.json({
        success: true,
        message: "Alt kategori başarıyla silindi",
      });
    } catch (error) {
      console.error("Error deleting sub category:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete sub category",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// ==================== VERGİ DAİRELERİ ====================

// Tüm vergi dairelerini getir
router.get(
  "/tax-offices",
  authenticateToken,
  validateAdminRole,
  async (req: AuthRequest, res) => {
    try {
      const { city } = req.query;

      let query: any = { isActive: true };
      if (city) {
        query.city = city;
      }

      const taxOffices = await TaxOffice.find(query)
        .sort({ order: 1, name: 1 })
        .lean();

      res.json({
        success: true,
        data: taxOffices,
      });
    } catch (error) {
      console.error("Error getting tax offices:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get tax offices",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Vergi dairesi oluştur
router.post(
  "/tax-offices",
  authenticateToken,
  validateAdminRole,
  async (req: AuthRequest, res) => {
    try {
      const { name, city, district, address, phone, order } = req.body;

      if (!name || !city) {
        return res.status(400).json({
          success: false,
          message: "Vergi dairesi adı ve şehir gereklidir",
        });
      }

      const existingTaxOffice = await TaxOffice.findOne({ name });
      if (existingTaxOffice) {
        return res.status(400).json({
          success: false,
          message: "Bu vergi dairesi adı zaten mevcut",
        });
      }

      const taxOffice = new TaxOffice({
        name,
        city,
        district,
        address,
        phone,
        order: order || 0,
      });

      await taxOffice.save();

      res.status(201).json({
        success: true,
        message: "Vergi dairesi başarıyla oluşturuldu",
        data: taxOffice,
      });
    } catch (error) {
      console.error("Error creating tax office:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create tax office",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Vergi dairesi güncelle
router.put(
  "/tax-offices/:id",
  authenticateToken,
  validateAdminRole,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { name, city, district, address, phone, isActive, order } =
        req.body;

      const taxOffice = await TaxOffice.findById(id);
      if (!taxOffice) {
        return res.status(404).json({
          success: false,
          message: "Vergi dairesi bulunamadı",
        });
      }

      if (name && name !== taxOffice.name) {
        const existingTaxOffice = await TaxOffice.findOne({ name });
        if (existingTaxOffice) {
          return res.status(400).json({
            success: false,
            message: "Bu vergi dairesi adı zaten mevcut",
          });
        }
      }

      if (name) taxOffice.name = name;
      if (city) taxOffice.city = city;
      if (district !== undefined) taxOffice.district = district;
      if (address !== undefined) taxOffice.address = address;
      if (phone !== undefined) taxOffice.phone = phone;
      if (isActive !== undefined) taxOffice.isActive = isActive;
      if (order !== undefined) taxOffice.order = order;

      await taxOffice.save();

      res.json({
        success: true,
        message: "Vergi dairesi başarıyla güncellendi",
        data: taxOffice,
      });
    } catch (error) {
      console.error("Error updating tax office:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update tax office",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Vergi dairesi sil (soft delete)
router.delete(
  "/tax-offices/:id",
  authenticateToken,
  validateAdminRole,
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      const taxOffice = await TaxOffice.findById(id);
      if (!taxOffice) {
        return res.status(404).json({
          success: false,
          message: "Vergi dairesi bulunamadı",
        });
      }

      taxOffice.isActive = false;
      await taxOffice.save();

      res.json({
        success: true,
        message: "Vergi dairesi başarıyla silindi",
      });
    } catch (error) {
      console.error("Error deleting tax office:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete tax office",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export default router;
