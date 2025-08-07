import express, { Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import { ProductionListing } from "../models/ProductionListing.model";
import { User } from "../models/User.model";
import { Notification } from "../models/Notification.model";

const router = express.Router();

interface AuthRequest extends Request {
  user?: any;
}

// Apply middleware to all routes
router.use(authenticateToken);

// POST /:productionListingId/offer - Create a new offer
router.post(
  "/:productionListingId/offer",
  async (req: AuthRequest, res: Response) => {
    try {
      const { productionListingId } = req.params;
      const { price, currency, message, deliveryTime } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Kullanıcı kimliği bulunamadı",
        });
      }

      // Validate required fields
      if (!price || !currency || !deliveryTime) {
        return res.status(400).json({
          success: false,
          message: "Fiyat, para birimi ve teslimat süresi zorunludur",
        });
      }

      // Check if production listing exists and is active
      const productionListing = await ProductionListing.findById(
        productionListingId
      );
      if (!productionListing) {
        return res.status(404).json({
          success: false,
          message: "Üretim ilanı bulunamadı",
        });
      }

      if (!productionListing.isActive) {
        return res.status(400).json({
          success: false,
          message: "Bu üretim ilanı artık aktif değil",
        });
      }

      // Check if user already made an offer
      const existingOffer = productionListing.offers.find(
        (offer: any) => offer.user.toString() === userId
      );

      if (existingOffer) {
        return res.status(400).json({
          success: false,
          message: "Bu üretim ilanı için zaten teklif vermişsiniz",
        });
      }

      // Create offer ID
      const offerId = `OFFER${Date.now()}`;

      // Add offer to production listing
      await productionListing.addOffer(
        userId,
        offerId,
        price,
        currency,
        message,
        deliveryTime
      );

      // Send notification to producer
      if (productionListing.notificationSettings?.newOfferNotification) {
        const notification = new Notification({
          user: productionListing.producer,
          type: "production_offer",
          title: "Yeni Teklif",
          message: `${productionListing.title} ilanınıza yeni bir teklif geldi`,
          data: {
            productionListingId: productionListing._id,
            offerId: offerId,
            price: price,
            currency: currency,
          },
        });
        await notification.save();
      }

      res.status(201).json({
        success: true,
        message: "Teklif başarıyla gönderildi",
        data: {
          offerId: offerId,
          price: price,
          currency: currency,
          message: message,
          deliveryTime: deliveryTime,
        },
      });
    } catch (error) {
      console.error("Error creating offer:", error);
      res.status(500).json({
        success: false,
        message: "Teklif oluşturulurken hata oluştu",
      });
    }
  }
);

// GET /:productionListingId/offers - Get all offers for a production listing
router.get(
  "/:productionListingId/offers",
  async (req: AuthRequest, res: Response) => {
    try {
      const { productionListingId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Kullanıcı kimliği bulunamadı",
        });
      }

      // Check if production listing exists
      const productionListing = await ProductionListing.findById(
        productionListingId
      )
        .populate("offers.user", "name email phone avatar")
        .populate("producer", "name email");

      if (!productionListing) {
        return res.status(404).json({
          success: false,
          message: "Üretim ilanı bulunamadı",
        });
      }

      // Check if user is the producer of this listing
      if (productionListing.producer.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "Bu işlem için yetkiniz yok",
        });
      }

      res.json({
        success: true,
        message: "Teklifler başarıyla getirildi",
        data: productionListing.offers,
      });
    } catch (error) {
      console.error("Error getting offers:", error);
      res.status(500).json({
        success: false,
        message: "Teklifler getirilirken hata oluştu",
      });
    }
  }
);

// PUT /:productionListingId/offers/:offerId/status - Update offer status
router.put(
  "/:productionListingId/offers/:offerId/status",
  async (req: AuthRequest, res: Response) => {
    try {
      const { productionListingId, offerId } = req.params;
      const { status } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Kullanıcı kimliği bulunamadı",
        });
      }

      if (!["accepted", "rejected"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Geçersiz durum",
        });
      }

      // Check if production listing exists
      const productionListing = await ProductionListing.findById(
        productionListingId
      ).populate("offers.user", "name email");

      if (!productionListing) {
        return res.status(404).json({
          success: false,
          message: "Üretim ilanı bulunamadı",
        });
      }

      // Check if user is the producer of this listing
      if (productionListing.producer.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "Bu işlem için yetkiniz yok",
        });
      }

      // Find and update the offer
      const offerIndex = productionListing.offers.findIndex(
        (offer: any) => offer.offerId === offerId
      );

      if (offerIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "Teklif bulunamadı",
        });
      }

      // Update offer status
      productionListing.offers[offerIndex].status = status;
      productionListing.offers[offerIndex].updatedAt = new Date();

      await productionListing.save();

      // Send notification to offer creator
      const offer = productionListing.offers[offerIndex];
      const notification = new Notification({
        user: offer.user._id,
        type: status === "accepted" ? "offer_accepted" : "offer_rejected",
        title:
          status === "accepted"
            ? "Teklifiniz Kabul Edildi"
            : "Teklifiniz Reddedildi",
        message:
          status === "accepted"
            ? `${productionListing.title} ilanına verdiğiniz teklif kabul edildi`
            : `${productionListing.title} ilanına verdiğiniz teklif reddedildi`,
        data: {
          productionListingId: productionListing._id,
          offerId: offerId,
          status: status,
        },
      });
      await notification.save();

      res.json({
        success: true,
        message: `Teklif ${status === "accepted" ? "kabul" : "red"} edildi`,
        data: {
          offerId: offerId,
          status: status,
        },
      });
    } catch (error) {
      console.error("Error updating offer status:", error);
      res.status(500).json({
        success: false,
        message: "Teklif durumu güncellenirken hata oluştu",
      });
    }
  }
);

// GET /:productionListingId/offer-status - Check if user has made an offer
router.get(
  "/:productionListingId/offer-status",
  async (req: AuthRequest, res: Response) => {
    try {
      const { productionListingId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Kullanıcı kimliği bulunamadı",
        });
      }

      // Check if production listing exists
      const productionListing = await ProductionListing.findById(
        productionListingId
      );

      if (!productionListing) {
        return res.status(404).json({
          success: false,
          message: "Üretim ilanı bulunamadı",
        });
      }

      // Check if user has made an offer
      const userOffer = productionListing.offers.find(
        (offer: any) => offer.user.toString() === userId
      );

      res.json({
        success: true,
        message: "Teklif durumu başarıyla getirildi",
        data: {
          hasOffered: !!userOffer,
          offer: userOffer
            ? {
                status: userOffer.status,
                price: userOffer.price,
                currency: userOffer.currency,
                message: userOffer.message,
                deliveryTime: userOffer.deliveryTime,
                createdAt: userOffer.createdAt,
              }
            : null,
        },
      });
    } catch (error) {
      console.error("Error getting offer status:", error);
      res.status(500).json({
        success: false,
        message: "Teklif durumu getirilirken hata oluştu",
      });
    }
  }
);

// GET /:productionListingId/stats - Get production listing statistics
router.get(
  "/:productionListingId/stats",
  async (req: AuthRequest, res: Response) => {
    try {
      const { productionListingId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "Kullanıcı kimliği bulunamadı",
        });
      }

      // Check if production listing exists
      const productionListing = await ProductionListing.findById(
        productionListingId
      );

      if (!productionListing) {
        return res.status(404).json({
          success: false,
          message: "Üretim ilanı bulunamadı",
        });
      }

      // Check if user is the producer of this listing
      if (productionListing.producer.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "Bu işlem için yetkiniz yok",
        });
      }

      // Calculate statistics
      const pendingOffers = productionListing.offers.filter(
        (offer: any) => offer.status === "pending"
      ).length;
      const acceptedOffers = productionListing.offers.filter(
        (offer: any) => offer.status === "accepted"
      ).length;
      const rejectedOffers = productionListing.offers.filter(
        (offer: any) => offer.status === "rejected"
      ).length;

      res.json({
        success: true,
        message: "İstatistikler başarıyla getirildi",
        data: {
          totalOffers: productionListing.totalOffers,
          totalLikes: productionListing.totalLikes,
          totalViews: productionListing.totalViews,
          pendingOffers,
          acceptedOffers,
          rejectedOffers,
          isActive: productionListing.isActive,
        },
      });
    } catch (error) {
      console.error("Error getting stats:", error);
      res.status(500).json({
        success: false,
        message: "İstatistikler getirilirken hata oluştu",
      });
    }
  }
);

export default router;
