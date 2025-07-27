import express, { Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import { requireProducer } from "../middleware/roleAuth";
import { uploadSingle, deleteFromS3 } from "../config/s3";
import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";
import {
  ProductionCategory,
  Producer,
  ProducerStorefront,
  User,
} from "../models";

interface AuthRequest extends Request {
  user?: any;
}

// S3 Client for video uploads
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const router = express.Router();

// Middleware to ensure producer access
router.use(authenticateToken);
router.use(requireProducer);

// GET producer profile (vitrinim bilgileri)
router.get("/my-shop-window", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    // Find producer by user ID
    const producer = await Producer.findOne({ user: userId }).populate("user");

    if (!producer) {
      return res.status(404).json({
        success: false,
        message: "Producer bulunamadı",
      });
    }

    // Find storefront for this producer
    const storefront = await ProducerStorefront.findOne({
      producer: producer._id,
    });

    // Get user details
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı",
      });
    }

    res.json({
      success: true,
      data: {
        producer: {
          id: producer._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profileImage: producer.profileImage,
          companyName: producer.companyName,
          taxIdNumber: producer.taxIdNumber,
          phoneNumber: producer.phoneNumber,
          gender: producer.gender,
          backupPhone: producer.backupPhone,
        },
        storefront: storefront
          ? {
              companyName: storefront.companyName,
              taxOffice: storefront.taxOffice,
              taxNumber: storefront.taxNumber,
              city: storefront.city,
              district: storefront.district,
              address: storefront.address,
              mainProductionCategory: storefront.mainProductionCategory,
              subProductionCategories: storefront.subProductionCategories,
              companyDescription: storefront.companyDescription,
              companyVideo: storefront.companyVideo,
              deliveryRegions: storefront.deliveryRegions,
              estimatedDeliveryTime: storefront.estimatedDeliveryTime,
              shippingMethod: storefront.shippingMethod,
              nonDeliveryRegions: storefront.nonDeliveryRegions,
              customProduction: storefront.customProduction,
              averageProductionTime: storefront.averageProductionTime,
              sampleDelivery: storefront.sampleDelivery,
              offerArea: storefront.offerArea,
              serviceTags: storefront.serviceTags,
              interestTags: storefront.interestTags,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Producer profile getirilirken hata:", error);
    res.status(500).json({
      success: false,
      message: "Producer profili getirilemedi",
    });
  }
});

// GET producer personal profile (kişisel bilgiler)
router.get("/profile", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    // Find producer by user ID
    const producer = await Producer.findOne({ user: userId }).populate("user");

    if (!producer) {
      return res.status(404).json({
        success: false,
        message: "Producer bulunamadı",
      });
    }

    // Get user details
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı",
      });
    }

    res.json({
      success: true,
      data: {
        producer: {
          id: producer._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profileImage: producer.profileImage,
          companyName: producer.companyName,
          taxIdNumber: producer.taxIdNumber,
          phoneNumber: producer.phoneNumber,
          gender: producer.gender,
          backupPhone: producer.backupPhone,
        },
        storefront: null, // Personal profile doesn't include storefront data
      },
    });
  } catch (error) {
    console.error("Producer personal profile getirilirken hata:", error);
    res.status(500).json({
      success: false,
      message: "Producer kişisel profili getirilemedi",
    });
  }
});

// PUT update producer profile (vitrinim)
router.put("/my-shop-window", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const updateData = req.body;

    // Find producer by user ID
    const producer = await Producer.findOne({ user: userId });

    if (!producer) {
      return res.status(404).json({
        success: false,
        message: "Producer bulunamadı",
      });
    }

    // Find or create storefront
    let storefront = await ProducerStorefront.findOne({
      producer: producer._id,
    });

    if (!storefront) {
      storefront = new ProducerStorefront({
        producer: producer._id,
        companyName: updateData.companyName || producer.companyName,
        companyDescription: updateData.description || "",
        companyVideo: updateData.videoUrl || "",
        taxOffice: updateData.taxOffice || "",
        taxNumber: updateData.taxNumber || producer.taxIdNumber,
        city: updateData.city || "",
        district: updateData.district || "",
        address: updateData.address || "",
        mainProductionCategory: updateData.mainCategory || "",
        subProductionCategories: updateData.subCategories || [],
        serviceTags: updateData.serviceTags || [],
        interestTags: updateData.interestTags || [],
        deliveryRegions: updateData.deliveryRegions || [],
        estimatedDeliveryTime: updateData.estimatedDeliveryTime || "",
        shippingMethod: updateData.shippingMethod || "",
        nonDeliveryRegions: updateData.nonDeliveryRegions || [],
        customProduction: updateData.customProduction || false,
        averageProductionTime: updateData.averageProductionTime || "",
        sampleDelivery: updateData.sampleDelivery || false,
        offerArea: updateData.offerArea || "",
      });
    } else {
      // Update existing storefront
      Object.assign(storefront, {
        companyName: updateData.companyName || storefront.companyName,
        companyDescription:
          updateData.description || storefront.companyDescription,
        companyVideo: updateData.videoUrl || storefront.companyVideo,
        taxOffice: updateData.taxOffice || storefront.taxOffice,
        taxNumber: updateData.taxNumber || storefront.taxNumber,
        city: updateData.city || storefront.city,
        district: updateData.district || storefront.district,
        address: updateData.address || storefront.address,
        mainProductionCategory:
          updateData.mainCategory || storefront.mainProductionCategory,
        subProductionCategories:
          updateData.subCategories || storefront.subProductionCategories,
        serviceTags: updateData.serviceTags || storefront.serviceTags,
        interestTags: updateData.interestTags || storefront.interestTags,
        deliveryRegions:
          updateData.deliveryRegions || storefront.deliveryRegions,
        estimatedDeliveryTime:
          updateData.estimatedDeliveryTime || storefront.estimatedDeliveryTime,
        shippingMethod: updateData.shippingMethod || storefront.shippingMethod,
        nonDeliveryRegions:
          updateData.nonDeliveryRegions || storefront.nonDeliveryRegions,
        customProduction:
          updateData.customProduction !== undefined
            ? updateData.customProduction
            : storefront.customProduction,
        averageProductionTime:
          updateData.averageProductionTime || storefront.averageProductionTime,
        sampleDelivery:
          updateData.sampleDelivery !== undefined
            ? updateData.sampleDelivery
            : storefront.sampleDelivery,
        offerArea: updateData.offerArea || storefront.offerArea,
      });
    }

    await storefront.save();

    res.json({
      success: true,
      message: "Vitrin bilgileri başarıyla güncellendi",
      data: {
        producer: {
          id: producer._id,
          companyName: producer.companyName,
          taxIdNumber: producer.taxIdNumber,
        },
        storefront: {
          companyName: storefront.companyName,
          taxOffice: storefront.taxOffice,
          taxNumber: storefront.taxNumber,
          city: storefront.city,
          district: storefront.district,
          address: storefront.address,
          mainProductionCategory: storefront.mainProductionCategory,
          subProductionCategories: storefront.subProductionCategories,
          companyDescription: storefront.companyDescription,
          companyVideo: storefront.companyVideo,
          deliveryRegions: storefront.deliveryRegions,
          estimatedDeliveryTime: storefront.estimatedDeliveryTime,
          shippingMethod: storefront.shippingMethod,
          nonDeliveryRegions: storefront.nonDeliveryRegions,
          customProduction: storefront.customProduction,
          averageProductionTime: storefront.averageProductionTime,
          sampleDelivery: storefront.sampleDelivery,
          offerArea: storefront.offerArea,
          serviceTags: storefront.serviceTags,
          interestTags: storefront.interestTags,
        },
      },
    });
  } catch (error) {
    console.error("Producer profile güncellenirken hata:", error);
    res.status(500).json({
      success: false,
      message: "Producer profili güncellenemedi",
    });
  }
});

// PUT update producer personal profile (kişisel bilgiler)
router.put("/profile", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const updateData = req.body;

    // Find producer by user ID
    const producer = await Producer.findOne({ user: userId });

    if (!producer) {
      return res.status(404).json({
        success: false,
        message: "Producer bulunamadı",
      });
    }

    // Update producer data
    Object.assign(producer, {
      companyName: updateData.companyName || producer.companyName,
      taxIdNumber: updateData.taxNumber || producer.taxIdNumber,
      phoneNumber: updateData.phone || producer.phoneNumber,
      gender: updateData.gender || producer.gender,
      backupPhone: updateData.backupPhone || producer.backupPhone,
      profileImage: updateData.profileImage || producer.profileImage,
    });

    await producer.save();

    // Update user data if provided
    if (updateData.firstName || updateData.lastName || updateData.email) {
      const user = await User.findById(userId);
      if (user) {
        Object.assign(user, {
          firstName: updateData.firstName || user.firstName,
          lastName: updateData.lastName || user.lastName,
          email: updateData.email || user.email,
        });
        await user.save();
      }
    }

    res.json({
      success: true,
      message: "Kişisel bilgiler başarıyla güncellendi",
      data: {
        producer: {
          id: producer._id,
          companyName: producer.companyName,
          taxIdNumber: producer.taxIdNumber,
          phoneNumber: producer.phoneNumber,
          gender: producer.gender,
          backupPhone: producer.backupPhone,
          profileImage: producer.profileImage,
        },
        storefront: null,
      },
    });
  } catch (error) {
    console.error("Producer personal profile güncellenirken hata:", error);
    res.status(500).json({
      success: false,
      message: "Producer kişisel profili güncellenemedi",
    });
  }
});

// GET all categories for producer
router.get("/categories", async (req: AuthRequest, res: Response) => {
  try {
    const categories = await ProductionCategory.find({ isActive: true }).sort({
      name: 1,
    });

    res.json({
      categories,
    });
  } catch (error) {
    console.error("Kategoriler getirilirken hata:", error);
    res.status(500).json({ message: "Kategoriler getirilemedi" });
  }
});

// GET subcategories for a specific parent category
router.get(
  "/categories/:parentId/subcategories",
  async (req: AuthRequest, res: Response) => {
    try {
      const { parentId } = req.params;

      const subcategories = await ProductionCategory.find({
        parentCategory: parentId,
        type: "vitrin",
        vitrinCategory: "uretim",
        isActive: true,
      }).sort({ name: 1 });

      res.json({
        subcategories,
      });
    } catch (error) {
      console.error("Alt kategoriler getirilirken hata:", error);
      res.status(500).json({ message: "Alt kategoriler getirilemedi" });
    }
  }
);

// GET all interest categories for producer
router.get("/interest-categories", async (req: AuthRequest, res: Response) => {
  try {
    const { InterestCategory } = await import("../models");
    const { search } = req.query;

    let filter: any = { isActive: true };

    // Arama filtresi ekle
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const interestCategories = await InterestCategory.find(filter)
      .sort({ order: 1, name: 1 })
      .select("-__v");

    const response = {
      success: true,
      data: interestCategories,
    };

    res.json(response);
  } catch (error) {
    console.error("İlgi alanları kategorileri getirilirken hata:", error);
    res.status(500).json({
      success: false,
      message: "İlgi alanları kategorileri getirilemedi",
    });
  }
});

// GET service sectors for producer
router.get("/service-sectors", async (req: AuthRequest, res: Response) => {
  try {
    const { ServiceSector } = await import("../models");
    const { search } = req.query;

    let filter: any = { isActive: true };

    // Arama filtresi ekle
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const serviceSectors = await ServiceSector.find(filter)
      .sort({ order: 1, name: 1 })
      .select("-__v");

    const response = {
      success: true,
      data: serviceSectors,
    };

    res.json(response);
  } catch (error) {
    console.error("Hizmet sektörleri getirilirken hata:", error);
    res.status(500).json({
      success: false,
      message: "Hizmet sektörleri getirilemedi",
    });
  }
});

// GET service tags for producer (legacy - keeping for backward compatibility)
router.get("/service-tags", async (req: AuthRequest, res: Response) => {
  try {
    // Hizmet etiketleri - şimdilik statik olarak tanımlı, ileride veritabanından çekilebilir
    const serviceTags = [
      "Hızlı Teslimat",
      "Kaliteli Malzeme",
      "Özel Tasarım",
      "Toplu Üretim",
      "Numune Gönderimi",
      "Garantili Ürün",
      "Çevre Dostu",
      "ISO Sertifikalı",
      "Müşteri Memnuniyeti",
      "Uygun Fiyat",
      "Teknik Destek",
      "7/24 Hizmet",
      "Deneyimli Ekip",
      "Modern Teknoloji",
      "Sürdürülebilir",
      "Yerli Üretim",
      "İhracat Kalitesi",
      "Özel Projeler",
      "Hızlı Prototip",
      "Kalite Kontrol",
    ];

    res.json({
      success: true,
      data: serviceTags,
    });
  } catch (error) {
    console.error("Hizmet etiketleri getirilirken hata:", error);
    res.status(500).json({
      success: false,
      message: "Hizmet etiketleri getirilemedi",
    });
  }
});

// POST upload company video (ilk yükleme)
router.post(
  "/my-shop-window/video",
  async (req: AuthRequest, res: Response) => {
    // Use multer with "video" field name
    const uploadVideo = multer({
      storage: multerS3({
        s3: s3Client,
        bucket: process.env.AWS_S3_BUCKET_NAME || "uretix-bucket",
        metadata: function (req, file, cb) {
          cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
          // Generate unique filename for videos
          const fileName = `videos/${Date.now()}-${file.originalname}`;
          cb(null, fileName);
        },
        acl: "public-read", // Make videos publicly accessible
        contentType: function (req, file, cb) {
          cb(null, file.mimetype);
        },
      }),
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit for videos
      },
      fileFilter: (req, file, cb) => {
        // Allow only video files
        if (file.mimetype.startsWith("video/")) {
          cb(null, true);
        } else {
          cb(new Error("Sadece video dosyaları kabul edilir"));
        }
      },
    }).single("video");

    uploadVideo(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          message: "Video yükleme hatası",
          error: err.message,
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Video dosyası seçilmedi",
        });
      }

      try {
        const userId = req.user?.id;
        const file = req.file as any;

        // Find producer by user ID
        const producer = await Producer.findOne({ user: userId });

        if (!producer) {
          return res.status(404).json({
            success: false,
            message: "Producer bulunamadı",
          });
        }

        // Find or create storefront
        let storefront = await ProducerStorefront.findOne({
          producer: producer._id,
        });

        if (!storefront) {
          storefront = new ProducerStorefront({
            producer: producer._id,
            companyVideo: file.location,
          });
        } else {
          storefront.companyVideo = file.location;
        }

        await storefront.save();

        res.json({
          success: true,
          message: "Video başarıyla yüklendi",
          data: {
            videoUrl: file.location,
          },
        });
      } catch (error) {
        console.error("Video yükleme hatası:", error);
        res.status(500).json({
          success: false,
          message: "Video yüklenirken hata oluştu",
        });
      }
    });
  }
);

// Video güncelleme için multer middleware'i en üstte tanımla
const updateVideoMulter = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_S3_BUCKET_NAME || "uretix-bucket",
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const fileName = `videos/${Date.now()}-${file.originalname}`;
      cb(null, fileName);
    },
    acl: "public-read",
    contentType: function (req, file, cb) {
      cb(null, file.mimetype);
    },
  }),
  limits: {
    fileSize: 100 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Sadece video dosyaları kabul edilir"));
    }
  },
}).single("video");

// PUT update company video (video değiştirme)
router.put(
  "/my-shop-window/video",
  authenticateToken,
  requireProducer,
  updateVideoMulter,
  async (req: AuthRequest, res: Response) => {
    // Artık req.file doğrudan burada olacak!
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Video dosyası seçilmedi",
      });
    }

    try {
      const userId = req.user?.id;
      const file = req.file as any;

      // Find producer by user ID
      const producer = await Producer.findOne({ user: userId });

      if (!producer) {
        return res.status(404).json({
          success: false,
          message: "Producer bulunamadı",
        });
      }

      // Find storefront
      const storefront = await ProducerStorefront.findOne({
        producer: producer._id,
      });

      if (!storefront) {
        return res.status(404).json({
          success: false,
          message: "Storefront bulunamadı",
        });
      }

      // Eski videoyu S3'ten sil
      if (storefront.companyVideo) {
        try {
          const oldVideoKey = storefront.companyVideo.split("/").pop();
          if (oldVideoKey) {
            await deleteFromS3(`videos/${oldVideoKey}`);
            console.log(`Eski video silindi: ${oldVideoKey}`);
          }
        } catch (deleteError) {
          console.error("Eski video silinirken hata:", deleteError);
          // Eski video silinemese bile devam et
        }
      }

      // Yeni video URL'ini güncelle
      storefront.companyVideo = file.location;
      await storefront.save();

      res.json({
        success: true,
        message: "Video başarıyla güncellendi",
        data: {
          videoUrl: file.location,
        },
      });
    } catch (error) {
      console.error("Video güncelleme hatası:", error);
      res.status(500).json({
        success: false,
        message: "Video güncellenirken hata oluştu",
      });
    }
  }
);

export default router;
