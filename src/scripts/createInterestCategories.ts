import mongoose from "mongoose";
import { InterestCategory } from "../models/InterestCategory.model";

const sampleInterestCategories = [
  {
    name: "Teknoloji",
    description: "Teknoloji ve dijital ürünler",
    icon: "laptop",
    color: "#3B82F6",
    order: 1,
    isActive: true,
  },
  {
    name: "Sağlık",
    description: "Sağlık ve tıbbi ürünler",
    icon: "heart",
    color: "#EF4444",
    order: 2,
    isActive: true,
  },
  {
    name: "Eğitim",
    description: "Eğitim materyalleri ve hizmetleri",
    icon: "book",
    color: "#10B981",
    order: 3,
    isActive: true,
  },
  {
    name: "Spor",
    description: "Spor ekipmanları ve aktiviteleri",
    icon: "dumbbell",
    color: "#F59E0B",
    order: 4,
    isActive: true,
  },
  {
    name: "Moda",
    description: "Giyim ve aksesuar",
    icon: "shirt",
    color: "#8B5CF6",
    order: 5,
    isActive: true,
  },
  {
    name: "Ev & Yaşam",
    description: "Ev dekorasyonu ve yaşam ürünleri",
    icon: "home",
    color: "#06B6D4",
    order: 6,
    isActive: true,
  },
  {
    name: "Otomotiv",
    description: "Araç parçaları ve aksesuarları",
    icon: "car",
    color: "#84CC16",
    order: 7,
    isActive: true,
  },
  {
    name: "Yemek & İçecek",
    description: "Gıda ve içecek ürünleri",
    icon: "utensils",
    color: "#F97316",
    order: 8,
    isActive: true,
  },
  {
    name: "Sanat",
    description: "Sanat eserleri ve malzemeleri",
    icon: "palette",
    color: "#EC4899",
    order: 9,
    isActive: true,
  },
  {
    name: "Müzik",
    description: "Müzik aletleri ve ekipmanları",
    icon: "music",
    color: "#6366F1",
    order: 10,
    isActive: true,
  },
];

async function createInterestCategories() {
  try {
    console.log("=== İLGİ ALANLARI KATEGORİLERİ OLUŞTURMA BAŞLADI ===");

    // MongoDB bağlantısı
    const mongoUri =
      process.env.MONGODB_URI || "mongodb://localhost:27017/uretix";
    await mongoose.connect(mongoUri);
    console.log("MongoDB'ye bağlandı");

    // Mevcut kategorileri kontrol et
    const existingCategories = await InterestCategory.find({});
    console.log(`Mevcut kategori sayısı: ${existingCategories.length}`);

    if (existingCategories.length > 0) {
      console.log("Veritabanında zaten ilgi alanları kategorileri mevcut:");
      existingCategories.forEach((cat, index) => {
        console.log(
          `${index + 1}. ${cat.name} (${cat.isActive ? "Aktif" : "Pasif"})`
        );
      });

      // Mevcut kategorileri güncelle (isActive = true yap)
      for (const category of existingCategories) {
        if (!category.isActive) {
          category.isActive = true;
          await category.save();
          console.log(`${category.name} kategorisi aktif hale getirildi`);
        }
      }
    } else {
      // Yeni kategoriler oluştur
      console.log("Yeni ilgi alanları kategorileri oluşturuluyor...");

      for (const categoryData of sampleInterestCategories) {
        const category = new InterestCategory(categoryData);
        await category.save();
        console.log(`✓ ${category.name} kategorisi oluşturuldu`);
      }

      console.log("Tüm kategoriler başarıyla oluşturuldu!");
    }

    // Son durumu kontrol et
    const finalCategories = await InterestCategory.find({
      isActive: true,
    }).sort({ order: 1 });
    console.log(`\nToplam aktif kategori sayısı: ${finalCategories.length}`);
    console.log("Aktif kategoriler:");
    finalCategories.forEach((cat, index) => {
      console.log(
        `${index + 1}. ${cat.name} - ${cat.description || "Açıklama yok"}`
      );
    });

    console.log("=== İLGİ ALANLARI KATEGORİLERİ OLUŞTURMA TAMAMLANDI ===");
  } catch (error) {
    console.error("Hata oluştu:", error);
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB bağlantısı kapatıldı");
  }
}

// Script'i çalıştır
createInterestCategories();
