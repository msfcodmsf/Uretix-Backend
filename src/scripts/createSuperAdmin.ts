import mongoose from "mongoose";
import dotenv from "dotenv";
import { User } from "../models/User";
import bcrypt from "bcryptjs";

dotenv.config();

const createSuperAdmin = async () => {
  try {
    // MongoDB bağlantısı
    const MONGODB_URI =
      process.env.MONGO_DB_URL || "mongodb://localhost:27017/uretix";
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB bağlantısı başarılı");

    // Super admin bilgileri
    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || "admin@uretix.com";
    const superAdminPassword =
      process.env.SUPER_ADMIN_PASSWORD || "StrongPassword123";

    // Mevcut super admin kontrolü
    const existingAdmin = await User.findOne({
      email: superAdminEmail,
      role: "superadmin",
    });

    if (existingAdmin) {
      console.log("Super admin zaten mevcut:", superAdminEmail);
      console.log("Mevcut super admin bilgileri:");
      console.log("- Email:", existingAdmin.email);
      console.log("- İsim:", existingAdmin.firstName, existingAdmin.lastName);
      console.log("- Rol:", existingAdmin.role);
      console.log("- Aktif:", existingAdmin.isActive);
      return;
    }

    // Yeni super admin oluştur
    const superAdmin = new User({
      email: superAdminEmail,
      password: superAdminPassword,
      firstName: "Super",
      lastName: "Admin",
      role: "superadmin",
      acceptClarificationText: true,
      acceptElectronicMessage: true,
      isActive: true,
    });

    await superAdmin.save();
    console.log("✅ Super admin başarıyla oluşturuldu!");
    console.log("📧 Email:", superAdminEmail);
    console.log("🔑 Şifre:", superAdminPassword);
    console.log("👤 İsim:", superAdmin.firstName, superAdmin.lastName);
    console.log("🔐 Rol:", superAdmin.role);
    console.log("✅ Aktif:", superAdmin.isActive);
    console.log("\n🚀 Artık bu bilgilerle giriş yapabilirsiniz!");
  } catch (error) {
    console.error("❌ Hata:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB bağlantısı kapatıldı");
  }
};

// Script'i çalıştır
createSuperAdmin();
