import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const fixDatabase = async () => {
  try {
    // MongoDB bağlantısı
    const MONGODB_URI =
      process.env.MONGO_DB_URL || "mongodb://localhost:27017/uretix";
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB bağlantısı başarılı");

    // Users collection'ını al
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Veritabanı bağlantısı kurulamadı");
    }

    const usersCollection = db.collection("users");

    // Mevcut index'leri listele
    const indexes = await usersCollection.indexes();
    console.log(
      "Mevcut index'ler:",
      indexes.map((idx) => idx.name)
    );

    // Username index'ini bul ve sil
    const usernameIndex = indexes.find(
      (idx) => idx.key && idx.key.username !== undefined
    );

    if (usernameIndex && usernameIndex.name) {
      console.log("Username index'i bulundu, siliniyor...");
      await usersCollection.dropIndex(usernameIndex.name);
      console.log("✅ Username index'i silindi");
    } else {
      console.log("Username index'i bulunamadı");
    }

    // Email index'ini kontrol et
    const emailIndex = indexes.find(
      (idx) => idx.key && idx.key.email !== undefined
    );

    if (!emailIndex) {
      console.log("Email index'i oluşturuluyor...");
      await usersCollection.createIndex({ email: 1 }, { unique: true });
      console.log("✅ Email index'i oluşturuldu");
    } else {
      console.log("Email index'i zaten mevcut");
    }

    console.log("✅ Veritabanı düzeltildi!");
  } catch (error) {
    console.error("❌ Hata:", error);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB bağlantısı kapatıldı");
  }
};

// Script'i çalıştır
fixDatabase();
