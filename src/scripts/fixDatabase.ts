import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGO_DB_URL || "";

async function fixDatabase() {
  try {
    console.log("MongoDB'ye bağlanılıyor...");
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB bağlantısı başarılı");

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Veritabanı bağlantısı kurulamadı");
    }

    // ProductionCategory collection'ındaki index'leri listele
    console.log("Mevcut index'ler:");
    const indexes = await db.collection("productioncategories").indexes();
    console.log(indexes);

    // slug_1 index'ini kaldır
    try {
      await db.collection("productioncategories").dropIndex("slug_1");
      console.log("slug_1 index'i başarıyla kaldırıldı");
    } catch (error) {
      console.log("slug_1 index'i zaten yok veya kaldırılamadı:", error);
    }

    // Yeni index'leri kontrol et
    console.log("Güncellenmiş index'ler:");
    const updatedIndexes = await db
      .collection("productioncategories")
      .indexes();
    console.log(updatedIndexes);

    console.log("Veritabanı düzeltme işlemi tamamlandı");
  } catch (error) {
    console.error("Veritabanı düzeltme hatası:", error);
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB bağlantısı kapatıldı");
  }
}

fixDatabase();
