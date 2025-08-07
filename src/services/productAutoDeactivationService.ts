import { Product } from "../models/Product.model";
import { Producer } from "../models/Producer.model";
import { Notification } from "../models/Notification.model";
import cron from "node-cron";

export class ProductAutoDeactivationService {
  // Günlük olarak çalışacak cron job
  static startAutoDeactivationCron() {
    // Her gün saat 00:00'da çalışır
    cron.schedule("0 0 * * *", async () => {
      console.log("🔄 Otomatik pasif hale getirme kontrolü başlatıldı...");
      await this.checkAndDeactivateProducts();
      await this.sendReminderNotifications();
    });

    console.log("✅ Otomatik pasif hale getirme servisi başlatıldı");
  }

  // Ürünleri kontrol et ve pasif hale getir
  static async checkAndDeactivateProducts() {
    try {
      const productsToDeactivate =
        await Product.findProductsForAutoDeactivation();

      for (const product of productsToDeactivate) {
        await this.deactivateProduct(product);
      }

      console.log(
        `📦 ${productsToDeactivate.length} ürün pasif hale getirildi`
      );
    } catch (error) {
      console.error("❌ Otomatik pasif hale getirme hatası:", error);
    }
  }

  // Ürünü pasif hale getir ve bildirim gönder
  static async deactivateProduct(product: any) {
    try {
      // Ürünü pasif hale getir
      product.isActive = false;
      await product.save();

      // Üreticiye bildirim gönder
      await this.sendDeactivationNotification(product);

      console.log(
        `🔴 Ürün pasif hale getirildi: ${product.name} (ID: ${product._id})`
      );
    } catch (error) {
      console.error(
        `❌ Ürün pasif hale getirme hatası (${product._id}):`,
        error
      );
    }
  }

  // Hatırlatma bildirimleri gönder
  static async sendReminderNotifications() {
    try {
      const productsForReminder = await Product.findProductsForReminder();

      for (const product of productsForReminder) {
        await this.sendReminderNotification(product);
      }

      console.log(
        `📢 ${productsForReminder.length} ürün için hatırlatma bildirimi gönderildi`
      );
    } catch (error) {
      console.error("❌ Hatırlatma bildirimi hatası:", error);
    }
  }

  // Pasif hale getirme bildirimi
  static async sendDeactivationNotification(product: any) {
    try {
      const producer = await Producer.findById(product.producer);
      if (!producer) return;

      const notification = new Notification({
        user: producer._id,
        type: "product_auto_deactivated",
        title: "Ürün Otomatik Pasif Hale Getirildi",
        message: `"${product.name}" ürününüz 14 gün süre dolduğu için otomatik olarak pasif hale getirildi. Ürünü tekrar aktif hale getirmek için ürün sayfasını ziyaret edin.`,
        data: {
          productId: product._id,
          productName: product.name,
          deactivatedAt: new Date(),
        },
        isRead: false,
      });

      await notification.save();
      console.log(
        `📧 Pasif hale getirme bildirimi gönderildi: ${product.name}`
      );
    } catch (error) {
      console.error("❌ Pasif hale getirme bildirimi hatası:", error);
    }
  }

  // Hatırlatma bildirimi (7 gün öncesi)
  static async sendReminderNotification(product: any) {
    try {
      const producer = await Producer.findById(product.producer);
      if (!producer) return;

      // Daha önce hatırlatma gönderilip gönderilmediğini kontrol et
      const existingReminder = await Notification.findOne({
        user: producer._id,
        type: "product_deactivation_reminder",
        "data.productId": product._id,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Son 24 saat
      });

      if (existingReminder) return; // Zaten hatırlatma gönderilmiş

      const daysLeft = Math.ceil(
        (product.autoDeactivateAt.getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      );

      const notification = new Notification({
        user: producer._id,
        type: "product_deactivation_reminder",
        title: "Ürün Pasif Hale Getirme Hatırlatması",
        message: `"${product.name}" ürününüz ${daysLeft} gün sonra otomatik olarak pasif hale gelecek. Ürünü aktif tutmak için yeniden aktifleştirin.`,
        data: {
          productId: product._id,
          productName: product.name,
          daysLeft,
          autoDeactivateAt: product.autoDeactivateAt,
        },
        isRead: false,
      });

      await notification.save();
      console.log(
        `📢 Hatırlatma bildirimi gönderildi: ${product.name} (${daysLeft} gün kaldı)`
      );
    } catch (error) {
      console.error("❌ Hatırlatma bildirimi hatası:", error);
    }
  }

  // Ürün etkileşim bildirimleri
  static async sendInteractionNotification(
    product: any,
    type: "like" | "comment" | "order",
    userId: string,
    data?: any
  ) {
    try {
      const producer = await Producer.findById(product.producer);
      if (!producer) return;

      // Bildirim ayarlarını kontrol et
      const notificationSetting =
        product.notificationSettings[
          `new${type.charAt(0).toUpperCase() + type.slice(1)}Notification`
        ];
      if (!notificationSetting) return;

      let title = "";
      let message = "";

      switch (type) {
        case "like":
          title = "Yeni Beğeni";
          message = `"${product.name}" ürününüz beğenildi!`;
          break;
        case "comment":
          title = "Yeni Yorum";
          message = `"${product.name}" ürününüze yeni bir yorum yapıldı!`;
          break;
        case "order":
          title = "Yeni Sipariş";
          message = `"${product.name}" ürününüz için yeni bir sipariş alındı!`;
          break;
      }

      const notification = new Notification({
        user: producer._id,
        type: `product_${type}`,
        title,
        message,
        data: {
          productId: product._id,
          productName: product.name,
          userId,
          ...data,
        },
        isRead: false,
      });

      await notification.save();
      console.log(`📧 ${type} bildirimi gönderildi: ${product.name}`);
    } catch (error) {
      console.error(`❌ ${type} bildirimi hatası:`, error);
    }
  }
}

export default ProductAutoDeactivationService;
