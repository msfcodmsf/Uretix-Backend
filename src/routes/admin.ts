import { Router, Request, Response } from "express";
import { User, UserRole } from "../models/User.model";
import { Producer } from "../models/Producer.model";
import { ProductionCategory } from "../models/ProductionCategory.model";
import { TaxOffice } from "../models/TaxOffice.model";
import { authenticateToken } from "../middleware/auth";
import { requireAdmin, requireSuperAdmin } from "../middleware/roleAuth";

const router = Router();

// Tüm kullanıcıları listele (admin ve super admin)
router.get(
  "/users",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const users = await User.find()
        .select("-password")
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        data: users,
      });
    } catch (error: unknown) {
      res.status(500).json({
        success: false,
        message: "Sunucu hatası",
        error: String(error),
      });
    }
  }
);

// Tüm kullanıcıları detaylı bilgilerle getir (admin ve super admin)
router.get(
  "/users-detailed",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const {
        page = 1,
        limit = 10,
        role,
        isActive,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
      } = req.query;

      // Filtreleme
      const filter: any = {};

      if (role) filter.role = role;
      if (isActive !== undefined) filter.isActive = isActive === "true";

      if (search) {
        filter.$or = [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      // Sayfalama
      const skip = (Number(page) - 1) * Number(limit);

      // Sıralama
      const sort: any = {};
      sort[sortBy as string] = sortOrder === "desc" ? -1 : 1;

      const users = await User.find(filter)
        .select("-password")
        .sort(sort)
        .skip(skip)
        .limit(Number(limit));

      // Her kullanıcı için producer bilgilerini de getir
      const usersWithProducerData = await Promise.all(
        users.map(async (user) => {
          let producerData = null;
          if (user.role === "producer") {
            const producer = await Producer.findOne({ user: user._id });
            if (producer) {
              producerData = {
                id: producer._id,
                companyName: producer.companyName,
                taxIdNumber: producer.taxIdNumber,
                phoneNumber: producer.phoneNumber,
                isVerified: producer.isVerified,
                createdAt: producer.createdAt,
                updatedAt: producer.updatedAt,
              };
            }
          }

          return {
            ...user.toObject(),
            producer: producerData,
          };
        })
      );

      const total = await User.countDocuments(filter);

      res.json({
        users: usersWithProducerData,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: unknown) {
      res.status(500).json({ message: "Sunucu hatası", error: String(error) });
    }
  }
);

// Tüm üreticileri listele (admin ve super admin)
router.get(
  "/producers",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const producers = await Producer.find({})
        .populate("user", "firstName lastName email role isActive")
        .sort({ createdAt: -1 });
      res.json(producers);
    } catch (error: unknown) {
      res.status(500).json({ message: "Sunucu hatası", error: String(error) });
    }
  }
);

// Kullanıcı rolünü güncelle (sadece super admin)
router.put(
  "/users/:userId/role",
  authenticateToken,
  requireSuperAdmin,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!["user", "producer", "admin", "superadmin"].includes(role)) {
        return res.status(400).json({ message: "Geçersiz rol" });
      }

      const user = await User.findByIdAndUpdate(
        userId,
        { role },
        { new: true }
      ).select("-password");

      if (!user) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      res.json({
        message: "Kullanıcı rolü güncellendi",
        user,
      });
    } catch (error: unknown) {
      res.status(500).json({ message: "Sunucu hatası", error: String(error) });
    }
  }
);

// Kullanıcıyı aktif/pasif yap (admin ve super admin)
router.put(
  "/users/:userId/status",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { isActive } = req.body;

      const user = await User.findByIdAndUpdate(
        userId,
        { isActive },
        { new: true }
      ).select("-password");

      if (!user) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      res.json({
        message: `Kullanıcı ${isActive ? "aktif" : "pasif"} yapıldı`,
        user,
      });
    } catch (error: unknown) {
      res.status(500).json({ message: "Sunucu hatası", error: String(error) });
    }
  }
);

// Üretici onaylama (admin ve super admin)
router.put(
  "/producers/:producerId/verify",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { producerId } = req.params;
      const { isVerified } = req.body;

      const producer = await Producer.findByIdAndUpdate(
        producerId,
        { isVerified },
        { new: true }
      ).populate("user", "firstName lastName email role");

      if (!producer) {
        return res.status(404).json({ message: "Üretici bulunamadı" });
      }

      res.json({
        message: `Üretici ${isVerified ? "onaylandı" : "onayı kaldırıldı"}`,
        producer,
      });
    } catch (error: unknown) {
      res.status(500).json({ message: "Sunucu hatası", error: String(error) });
    }
  }
);

// Kullanıcı istatistikleri (admin ve super admin)
router.get(
  "/stats",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const totalUsers = await User.countDocuments();
      const totalProducers = await Producer.countDocuments();
      const verifiedProducers = await Producer.countDocuments({
        isVerified: true,
      });
      const activeUsers = await User.countDocuments({ isActive: true });

      const roleStats = await User.aggregate([
        {
          $group: {
            _id: "$role",
            count: { $sum: 1 },
          },
        },
      ]);

      res.json({
        totalUsers,
        totalProducers,
        verifiedProducers,
        activeUsers,
        roleStats,
      });
    } catch (error: unknown) {
      res.status(500).json({ message: "Sunucu hatası", error: String(error) });
    }
  }
);

// Kullanıcı detayı (admin ve super admin)
router.get(
  "/users/:userId",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const user = await User.findById(userId).select("-password");
      if (!user) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      let producerData = null;
      if (user.role === "producer") {
        const producer = await Producer.findOne({ user: userId });
        if (producer) {
          producerData = {
            id: producer._id,
            companyName: producer.companyName,
            taxIdNumber: producer.taxIdNumber,
            phoneNumber: producer.phoneNumber,
            isVerified: producer.isVerified,
            createdAt: producer.createdAt,
            updatedAt: producer.updatedAt,
          };
        }
      }

      res.json({
        user,
        producer: producerData,
      });
    } catch (error: unknown) {
      res.status(500).json({ message: "Sunucu hatası", error: String(error) });
    }
  }
);

// Kullanıcı silme (sadece super admin)
router.delete(
  "/users/:userId",
  authenticateToken,
  requireSuperAdmin,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "Kullanıcı bulunamadı" });
      }

      // Eğer üretici ise producer kaydını da sil
      if (user.role === "producer") {
        await Producer.findOneAndDelete({ user: userId });
      }

      await User.findByIdAndDelete(userId);

      res.json({
        message: "Kullanıcı başarıyla silindi",
      });
    } catch (error: unknown) {
      res.status(500).json({ message: "Sunucu hatası", error: String(error) });
    }
  }
);

// Süper admin için admin oluşturma
router.post(
  "/create-admin",
  authenticateToken,
  requireSuperAdmin,
  async (req: Request, res: Response) => {
    try {
      const {
        email,
        password,
        firstName,
        lastName,
        acceptClarificationText = true,
        acceptElectronicMessage = true,
      } = req.body;

      // Zorunlu alanlar kontrolü
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({
          message: "Email, şifre, isim ve soyisim zorunludur",
        });
      }

      // Email formatı kontrolü
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          message: "Geçersiz email formatı",
        });
      }

      // Şifre güvenlik kontrolü
      if (password.length < 6) {
        return res.status(400).json({
          message: "Şifre en az 6 karakter olmalıdır",
        });
      }

      // Mevcut kullanıcı kontrolü
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          message: "Bu email adresi zaten kullanılıyor",
        });
      }

      // Yeni admin oluştur
      const admin = new User({
        email,
        password,
        firstName,
        lastName,
        role: "admin",
        acceptClarificationText,
        acceptElectronicMessage,
        isActive: true,
      });

      await admin.save();

      res.status(201).json({
        message: "Admin başarıyla oluşturuldu",
        admin: {
          id: admin._id,
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          role: admin.role,
          isActive: admin.isActive,
          createdAt: admin.createdAt,
        },
      });
    } catch (error: unknown) {
      res.status(500).json({ message: "Sunucu hatası", error: String(error) });
    }
  }
);

// Süper admin için admin listesi
router.get(
  "/admins",
  authenticateToken,
  requireSuperAdmin,
  async (req: Request, res: Response) => {
    try {
      const { page = 1, limit = 10, search, isActive } = req.query;

      // Filtreleme
      const filter: any = {
        role: { $in: ["admin", "superadmin"] },
      };

      if (isActive !== undefined) filter.isActive = isActive === "true";

      if (search) {
        filter.$or = [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ];
      }

      // Sayfalama
      const skip = (Number(page) - 1) * Number(limit);

      const admins = await User.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));

      const total = await User.countDocuments(filter);

      res.json({
        admins,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: unknown) {
      res.status(500).json({ message: "Sunucu hatası", error: String(error) });
    }
  }
);

// Süper admin için admin detayı
router.get(
  "/admins/:adminId",
  authenticateToken,
  requireSuperAdmin,
  async (req: Request, res: Response) => {
    try {
      const { adminId } = req.params;

      const admin = await User.findOne({
        _id: adminId,
        role: { $in: ["admin", "superadmin"] },
      }).select("-password");

      if (!admin) {
        return res.status(404).json({ message: "Admin bulunamadı" });
      }

      res.json({ admin });
    } catch (error: unknown) {
      res.status(500).json({ message: "Sunucu hatası", error: String(error) });
    }
  }
);

// Süper admin için admin güncelleme
router.put(
  "/admins/:adminId",
  authenticateToken,
  requireSuperAdmin,
  async (req: Request, res: Response) => {
    try {
      const { adminId } = req.params;
      const { firstName, lastName, isActive } = req.body;

      const admin = await User.findOneAndUpdate(
        {
          _id: adminId,
          role: { $in: ["admin", "superadmin"] },
        },
        { firstName, lastName, isActive },
        { new: true }
      ).select("-password");

      if (!admin) {
        return res.status(404).json({ message: "Admin bulunamadı" });
      }

      res.json({
        message: "Admin başarıyla güncellendi",
        admin,
      });
    } catch (error: unknown) {
      res.status(500).json({ message: "Sunucu hatası", error: String(error) });
    }
  }
);

// Süper admin için admin şifre değiştirme
router.put(
  "/admins/:adminId/password",
  authenticateToken,
  requireSuperAdmin,
  async (req: Request, res: Response) => {
    try {
      const { adminId } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({
          message: "Yeni şifre en az 6 karakter olmalıdır",
        });
      }

      const admin = await User.findOne({
        _id: adminId,
        role: { $in: ["admin", "superadmin"] },
      });

      if (!admin) {
        return res.status(404).json({ message: "Admin bulunamadı" });
      }

      // Şifreyi güncelle
      admin.password = newPassword;
      await admin.save();

      res.json({
        message: "Admin şifresi başarıyla güncellendi",
      });
    } catch (error: unknown) {
      res.status(500).json({ message: "Sunucu hatası", error: String(error) });
    }
  }
);

// Süper admin için admin silme
router.delete(
  "/admins/:adminId",
  authenticateToken,
  requireSuperAdmin,
  async (req: Request, res: Response) => {
    try {
      const { adminId } = req.params;

      const admin = await User.findOne({
        _id: adminId,
        role: "admin", // Sadece admin'leri sil, superadmin'leri silme
      });

      if (!admin) {
        return res.status(404).json({ message: "Admin bulunamadı" });
      }

      await User.findByIdAndDelete(adminId);

      res.json({
        message: "Admin başarıyla silindi",
      });
    } catch (error: unknown) {
      res.status(500).json({ message: "Sunucu hatası", error: String(error) });
    }
  }
);

// İstatistik endpoint'i
router.get(
  "/statistics",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      // Toplam kullanıcı sayısı
      const totalUsers = await User.countDocuments();

      // Toplam üretici sayısı
      const totalProducers = await User.countDocuments({ role: "producer" });

      // Toplam kategori sayısı
      const totalCategories = await ProductionCategory.countDocuments({
        isActive: true,
      });

      // Toplam vergi dairesi sayısı
      const totalTaxOffices = await TaxOffice.countDocuments({
        isActive: true,
      });

      res.json({
        success: true,
        data: {
          totalUsers,
          totalProducers,
          totalCategories,
          totalTaxOffices,
        },
      });
    } catch (error: unknown) {
      res.status(500).json({
        success: false,
        message: "Sunucu hatası",
        error: String(error),
      });
    }
  }
);

// Kullanıcı silme
router.delete(
  "/users/:userId",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Kullanıcı bulunamadı",
        });
      }

      // Super admin'lerin silinmesini engelle
      if (user.role === "superadmin") {
        return res.status(403).json({
          success: false,
          message: "Super admin kullanıcıları silinemez",
        });
      }

      await User.findByIdAndDelete(userId);

      res.json({
        success: true,
        message: "Kullanıcı başarıyla silindi",
      });
    } catch (error: unknown) {
      res.status(500).json({
        success: false,
        message: "Sunucu hatası",
        error: String(error),
      });
    }
  }
);

// Kullanıcı durumunu değiştirme
router.put(
  "/users/:userId/toggle-status",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Kullanıcı bulunamadı",
        });
      }

      // Super admin'lerin durumunu değiştirmeyi engelle
      if (user.role === "superadmin") {
        return res.status(403).json({
          success: false,
          message: "Super admin kullanıcılarının durumu değiştirilemez",
        });
      }

      user.isActive = !user.isActive;
      await user.save();

      res.json({
        success: true,
        message: `Kullanıcı ${user.isActive ? "aktif" : "pasif"} yapıldı`,
        data: { isActive: user.isActive },
      });
    } catch (error: unknown) {
      res.status(500).json({
        success: false,
        message: "Sunucu hatası",
        error: String(error),
      });
    }
  }
);

export default router;
