import express, { Request, Response } from "express";
import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";
import { authenticateToken } from "../middleware/auth";
import { requireProducer } from "../middleware/roleAuth";
import { Producer } from "../models/Producer.model";
import { News } from "../models/News.model";

const router = express.Router();

// S3 Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "eu-central-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

// Multer configuration for images
const uploadImage = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_S3_BUCKET || "uretix-bucket",
    key: (req, file, cb) => {
      const fileName = `news/${Date.now()}-${file.originalname}`;
      cb(null, fileName);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Sadece resim dosyaları kabul edilir"));
    }
  },
});

// Multer configuration for videos
const uploadVideo = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_S3_BUCKET || "uretix-bucket",
    key: (req, file, cb) => {
      const fileName = `news/videos/${Date.now()}-${file.originalname}`;
      cb(null, fileName);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Sadece video dosyaları kabul edilir"));
    }
  },
});

interface AuthRequest extends Request {
  user?: any;
}

// Apply middleware to all routes
router.use(authenticateToken);
router.use(requireProducer);

// GET all news for the authenticated producer
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { status = "active" } = req.query;

    // Find producer by user ID
    const producer = await Producer.findOne({ user: userId });

    if (!producer) {
      return res.status(404).json({
        success: false,
        message: "Producer bulunamadı",
      });
    }

    let filter: any = { producer: producer._id };

    // Filter by status
    if (status === "active") {
      filter.isActive = true;
      filter.isDeleted = false;
    } else if (status === "deleted") {
      filter.isDeleted = true;
    }

    const news = await News.find(filter)
      .sort({ createdAt: -1 })
      .populate("producer", "companyName");

    res.json({
      success: true,
      data: news,
    });
  } catch (error) {
    console.error("Error fetching news:", error);
    res.status(500).json({
      success: false,
      message: "Haberler getirilemedi",
    });
  }
});

// GET single news by ID
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    // Find producer by user ID
    const producer = await Producer.findOne({ user: userId });

    if (!producer) {
      return res.status(404).json({
        success: false,
        message: "Producer bulunamadı",
      });
    }

    const news = await News.findOne({
      _id: id,
      producer: producer._id,
    }).populate("producer", "companyName");

    if (!news) {
      return res.status(404).json({
        success: false,
        message: "Haber bulunamadı",
      });
    }

    res.json({
      success: true,
      data: news,
    });
  } catch (error) {
    console.error("Error fetching news:", error);
    res.status(500).json({
      success: false,
      message: "Haber getirilemedi",
    });
  }
});

// POST create new news
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const newsData = req.body;

    // Find producer by user ID
    const producer = await Producer.findOne({ user: userId });

    if (!producer) {
      return res.status(404).json({
        success: false,
        message: "Producer bulunamadı",
      });
    }

    // Validate required fields
    const requiredFields = ["title", "description", "category"];

    const missingFields = requiredFields.filter((field) => !newsData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Eksik alanlar: ${missingFields.join(", ")}`,
      });
    }

    // Validate title and description length
    if (newsData.title.length > 70) {
      return res.status(400).json({
        success: false,
        message: "Başlık en fazla 70 karakter olabilir",
      });
    }

    if (newsData.description.length > 70) {
      return res.status(400).json({
        success: false,
        message: "Açıklama en fazla 70 karakter olabilir",
      });
    }

    // Set default values for optional fields
    const newsToCreate = {
      ...newsData,
      producer: producer._id,
      tags: newsData.tags || [],
      detailImages: newsData.detailImages || [],
      coverImage: newsData.coverImage || null, // Remove default placeholder
      isActive: newsData.isActive !== undefined ? newsData.isActive : true,
      isDeleted: false,
      views: 0,
      likes: 0,
    };

    console.log("News to create:", newsToCreate);

    // Create new news
    const news = new News(newsToCreate);

    await news.save();

    res.status(201).json({
      success: true,
      message: "Haber başarıyla oluşturuldu",
      data: news,
    });
  } catch (error: any) {
    console.error("Error creating news:", error);

    // Mongoose validation error
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err: any) => err.message
      );
      return res.status(400).json({
        success: false,
        message: "Validation hatası",
        errors: validationErrors,
      });
    }

    res.status(500).json({
      success: false,
      message: "Haber oluşturulamadı",
      error: error.message,
    });
  }
});

// PUT update news
router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const updateData = req.body;

    // Find producer by user ID
    const producer = await Producer.findOne({ user: userId });

    if (!producer) {
      return res.status(404).json({
        success: false,
        message: "Producer bulunamadı",
      });
    }

    // Find news by ID and producer
    const news = await News.findOne({
      _id: id,
      producer: producer._id,
    });

    if (!news) {
      return res.status(404).json({
        success: false,
        message: "Haber bulunamadı",
      });
    }

    // Validate title and description length if provided
    if (updateData.title && updateData.title.length > 70) {
      return res.status(400).json({
        success: false,
        message: "Başlık en fazla 70 karakter olabilir",
      });
    }

    if (updateData.description && updateData.description.length > 70) {
      return res.status(400).json({
        success: false,
        message: "Açıklama en fazla 70 karakter olabilir",
      });
    }

    // Update news
    Object.assign(news, updateData);

    await news.save();

    res.json({
      success: true,
      message: "Haber başarıyla güncellendi",
      data: news,
    });
  } catch (error: any) {
    console.error("Error updating news:", error);

    // Mongoose validation error
    if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map(
        (err: any) => err.message
      );
      return res.status(400).json({
        success: false,
        message: "Validation hatası",
        errors: validationErrors,
      });
    }

    res.status(500).json({
      success: false,
      message: "Haber güncellenemedi",
      error: error.message,
    });
  }
});

// DELETE news (soft delete)
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    // Find producer by user ID
    const producer = await Producer.findOne({ user: userId });

    if (!producer) {
      return res.status(404).json({
        success: false,
        message: "Producer bulunamadı",
      });
    }

    // Find news by ID and producer
    const news = await News.findOne({
      _id: id,
      producer: producer._id,
    });

    if (!news) {
      return res.status(404).json({
        success: false,
        message: "Haber bulunamadı",
      });
    }

    // Soft delete
    news.isDeleted = true;
    news.isActive = false;

    await news.save();

    res.json({
      success: true,
      message: "Haber başarıyla silindi",
    });
  } catch (error) {
    console.error("Error deleting news:", error);
    res.status(500).json({
      success: false,
      message: "Haber silinemedi",
    });
  }
});

// POST upload cover image
router.post(
  "/:id/upload-image",
  uploadImage.single("image"),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Resim dosyası gerekli",
        });
      }

      // Find producer by user ID
      const producer = await Producer.findOne({ user: userId });

      if (!producer) {
        return res.status(404).json({
          success: false,
          message: "Producer bulunamadı",
        });
      }

      // Find news by ID and producer
      const news = await News.findOne({
        _id: id,
        producer: producer._id,
      });

      if (!news) {
        return res.status(404).json({
          success: false,
          message: "Haber bulunamadı",
        });
      }

      // Update news with image URL
      news.coverImage = (req.file as any).location;

      await news.save();

      res.json({
        success: true,
        message: "Resim başarıyla yüklendi",
        data: {
          imageUrl: (req.file as any).location,
        },
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({
        success: false,
        message: "Resim yüklenemedi",
      });
    }
  }
);

// POST upload video
router.post(
  "/:id/upload-video",
  uploadVideo.single("video"),
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Video dosyası gerekli",
        });
      }

      // Find producer by user ID
      const producer = await Producer.findOne({ user: userId });

      if (!producer) {
        return res.status(404).json({
          success: false,
          message: "Producer bulunamadı",
        });
      }

      // Find news by ID and producer
      const news = await News.findOne({
        _id: id,
        producer: producer._id,
      });

      if (!news) {
        return res.status(404).json({
          success: false,
          message: "Haber bulunamadı",
        });
      }

      // Update news with video URL
      news.videoUrl = (req.file as any).location;

      await news.save();

      res.json({
        success: true,
        message: "Video başarıyla yüklendi",
        data: {
          videoUrl: (req.file as any).location,
        },
      });
    } catch (error) {
      console.error("Error uploading video:", error);
      res.status(500).json({
        success: false,
        message: "Video yüklenemedi",
      });
    }
  }
);

// POST upload detail images
router.post(
  "/:id/upload-detail-images",
  uploadImage.array("images", 5), // Max 5 images
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Resim dosyaları gerekli",
        });
      }

      // Find producer by user ID
      const producer = await Producer.findOne({ user: userId });

      if (!producer) {
        return res.status(404).json({
          success: false,
          message: "Producer bulunamadı",
        });
      }

      // Find news by ID and producer
      const news = await News.findOne({
        _id: id,
        producer: producer._id,
      });

      if (!news) {
        return res.status(404).json({
          success: false,
          message: "Haber bulunamadı",
        });
      }

      // Get image URLs
      const imageUrls = (req.files as any[]).map((file) => file.location);

      // Add new images to existing ones
      news.detailImages = [...(news.detailImages || []), ...imageUrls];

      await news.save();

      res.json({
        success: true,
        message: "Resimler başarıyla yüklendi",
        data: {
          imageUrls,
          totalImages: news.detailImages.length,
        },
      });
    } catch (error) {
      console.error("Error uploading detail images:", error);
      res.status(500).json({
        success: false,
        message: "Resimler yüklenemedi",
      });
    }
  }
);

export default router;
