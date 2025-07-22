import { Router, Request, Response } from "express";
import { User } from "../models/User";
import { auth, generateToken } from "../middleware/auth";

const router = Router();

// Register
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Bu email veya kullanıcı adı zaten kullanılıyor",
      });
    }

    // Create new user
    const user = new User({
      username,
      email,
      password,
      firstName,
      lastName,
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id.toString());

    res.status(201).json({
      message: "Kullanıcı başarıyla oluşturuldu",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ message: "Sunucu hatası", error: String(error) });
  }
});

// Login
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

    // Generate token
    const token = generateToken(user._id.toString());

    res.json({
      message: "Giriş başarılı",
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ message: "Sunucu hatası", error: String(error) });
  }
});

// Get current user
router.get("/me", auth, async (req: any, res: Response) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.json(user);
  } catch (error: unknown) {
    res.status(500).json({ message: "Sunucu hatası", error: String(error) });
  }
});

// Update profile image
router.put("/profile-image", auth, async (req: any, res: Response) => {
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
});

export default router;
