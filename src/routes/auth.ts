import { Router, Request, Response } from "express";
import { User, UserRole } from "../models/User.model";
import { Producer } from "../models/Producer.model";
import { authenticateToken, generateToken } from "../middleware/auth";

const router = Router();

// Normal kullanıcı kaydı
router.post("/register/user", async (req: Request, res: Response) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      acceptClarificationText,
      acceptElectronicMessage,
    } = req.body;

    // Onay kontrolleri
    if (!acceptClarificationText || !acceptElectronicMessage) {
      return res.status(400).json({
        message: "Aydınlatma metni ve elektronik ileti onayları zorunludur",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: "Bu email adresi zaten kullanılıyor",
      });
    }

    // Create new user
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      role: "user",
      acceptClarificationText,
      acceptElectronicMessage,
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id.toString());

    res.status(201).json({
      message: "Kullanıcı başarıyla oluşturuldu",
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ message: "Sunucu hatası", error: String(error) });
  }
});

// Üretici kaydı
router.post("/register/my-dashboard", async (req: Request, res: Response) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      companyName,
      taxIdNumber,
      phoneNumber,
      acceptClarificationText,
      acceptElectronicMessage,
    } = req.body;

    // Onay kontrolleri
    if (!acceptClarificationText || !acceptElectronicMessage) {
      return res.status(400).json({
        message: "Aydınlatma metni ve elektronik ileti onayları zorunludur",
      });
    }

    // Zorunlu alanlar kontrolü
    if (!companyName || !taxIdNumber) {
      return res.status(400).json({
        message: "Şirket adı ve vergi kimlik numarası zorunludur",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: "Bu email adresi zaten kullanılıyor",
      });
    }

    // Check if tax ID already exists
    const existingProducer = await Producer.findOne({ taxIdNumber });
    if (existingProducer) {
      return res.status(400).json({
        message: "Bu vergi kimlik numarası zaten kullanılıyor",
      });
    }

    // Create new user with producer role
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      role: "producer",
      acceptClarificationText,
      acceptElectronicMessage,
    });

    await user.save();

    // Create producer profile
    const producer = new Producer({
      user: user._id,
      companyName,
      taxIdNumber,
      phoneNumber,
    });

    await producer.save();

    // Generate token
    const token = generateToken(user._id.toString());

    const response = {
      message: "Üretici başarıyla oluşturuldu",
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      producer: {
        id: producer._id,
        companyName: producer.companyName,
        taxIdNumber: producer.taxIdNumber,
        phoneNumber: producer.phoneNumber,
        isVerified: producer.isVerified,
      },
    };

    res.status(201).json(response);
  } catch (error: unknown) {
    console.error("Producer registration error:", error);
    res.status(500).json({ message: "Sunucu hatası", error: String(error) });
  }
});

// Login (hem kullanıcı hem üretici için)
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Geçersiz email veya şifre" });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Geçersiz email veya şifre" });
    }

    // Update last login time
    user.lastLoginAt = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id.toString());

    // Eğer üretici ise producer bilgilerini de getir
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
        };
      }
    }

    res.json({
      message: "Giriş başarılı",
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      producer: producerData,
    });
  } catch (error: unknown) {
    res.status(500).json({ message: "Sunucu hatası", error: String(error) });
  }
});

// Süper admin girişi
router.post("/login/superadmin", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Geçersiz email veya şifre" });
    }

    // Check if user is super admin
    if (user.role !== "superadmin") {
      return res.status(403).json({
        message: "Bu endpoint sadece süper adminler için geçerlidir",
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Geçersiz email veya şifre" });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ message: "Hesabınız pasif durumda" });
    }

    // Generate token
    const token = generateToken(user._id.toString());

    res.json({
      message: "Süper admin girişi başarılı",
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ message: "Sunucu hatası", error: String(error) });
  }
});

// Admin ve Superadmin girişi
router.post("/login/admin", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Geçersiz email veya şifre" });
    }

    // Check if user is admin or super admin
    if (!["admin", "superadmin"].includes(user.role)) {
      return res.status(403).json({
        message:
          "Bu panele sadece admin ve superadmin hesapları ile giriş yapabilirsiniz",
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Geçersiz email veya şifre" });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ message: "Hesabınız pasif durumda" });
    }

    // Update last login time
    user.lastLoginAt = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user._id.toString());

    res.json({
      success: true,
      message:
        user.role === "superadmin"
          ? "Superadmin girişi başarılı"
          : "Admin girişi başarılı",
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          isActive: user.isActive,
        },
      },
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      message: "Sunucu hatası",
      error: String(error),
    });
  }
});

// Get current user with producer data if applicable
router.get("/me", authenticateToken, async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.user._id).select("-password");

    let producerData = null;
    if (user?.role === "producer") {
      const producer = await Producer.findOne({ user: user._id });
      if (producer) {
        producerData = {
          id: producer._id,
          companyName: producer.companyName,
          taxIdNumber: producer.taxIdNumber,
          phoneNumber: producer.phoneNumber,
          isVerified: producer.isVerified,
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
});

// Update profile image
router.put(
  "/profile-image",
  authenticateToken,
  async (req: any, res: Response) => {
    try {
      const { profileImage } = req.body;

      const user = await User.findByIdAndUpdate(
        req.user._id,
        { profileImage },
        { new: true }
      ).select("-password");

      res.json({
        message: "Profil resmi güncellendi",
        user,
      });
    } catch (error: unknown) {
      res.status(500).json({ message: "Sunucu hatası", error: String(error) });
    }
  }
);

// Update producer profile
router.put(
  "/producer-profile",
  authenticateToken,
  async (req: any, res: Response) => {
    try {
      const { phoneNumber } = req.body;

      // Check if user is producer
      if (req.user.role !== "producer") {
        return res.status(403).json({
          message: "Bu işlem sadece üreticiler için geçerlidir",
        });
      }

      const producer = await Producer.findOneAndUpdate(
        { user: req.user._id },
        { phoneNumber },
        { new: true }
      );

      if (!producer) {
        return res.status(404).json({
          message: "Üretici profili bulunamadı",
        });
      }

      res.json({
        message: "Üretici profili güncellendi",
        producer,
      });
    } catch (error: unknown) {
      res.status(500).json({ message: "Sunucu hatası", error: String(error) });
    }
  }
);

export default router;
