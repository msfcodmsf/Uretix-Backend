import express, { Request, Response } from "express";
import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";
import { authenticateToken } from "../middleware/auth";
import { requireProducer } from "../middleware/roleAuth";
import { Service } from "../models";

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
      const fileName = `services/images/${Date.now()}-${file.originalname}`;
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
      const fileName = `services/videos/${Date.now()}-${file.originalname}`;
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

// Get all services for the authenticated producer
router.get(
  "/",
  authenticateToken,
  requireProducer,
  async (req: AuthRequest, res: Response) => {
    try {
      const { status } = req.query;
      const producerId = req.user.id;

      let query: any = { producer: producerId };

      if (status === "active") {
        query.isActive = true;
      } else if (status === "inactive") {
        query.isActive = false;
      }

      const services = await Service.find(query)
        .populate("category", "_id name")
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        data: services,
      });
    } catch (error: any) {
      console.error("Error fetching services:", error);
      res.status(500).json({
        success: false,
        message: "Hizmetler getirilemedi",
      });
    }
  }
);

// Get single service by ID
router.get(
  "/:id",
  authenticateToken,
  requireProducer,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const producerId = req.user.id;

      const service = await Service.findOne({
        _id: id,
        producer: producerId,
      }).populate("category", "_id name");

      if (!service) {
        return res.status(404).json({
          success: false,
          message: "Hizmet bulunamadı",
        });
      }

      console.log("=== HİZMET GET VERİLERİ ===");
      console.log("Service found:", service);
      console.log("Service images:", service.images);
      console.log("Service videoUrl:", service.videoUrl);
      console.log("Service tags:", service.tags);

      res.json({
        success: true,
        data: service,
      });
    } catch (error: any) {
      console.error("Error fetching service:", error);
      res.status(500).json({
        success: false,
        message: "Hizmet getirilemedi",
      });
    }
  }
);

// Create new service
router.post(
  "/",
  authenticateToken,
  requireProducer,
  async (req: AuthRequest, res: Response) => {
    try {
      const producerId = req.user.id;
      const { title, description, category, tags } = req.body;

      // Validation
      if (!title || !description || !category) {
        return res.status(400).json({
          success: false,
          message: "Başlık, açıklama ve kategori zorunludur",
        });
      }

      if (title.length > 70) {
        return res.status(400).json({
          success: false,
          message: "Başlık en fazla 70 karakter olabilir",
        });
      }

      if (description.length > 500) {
        return res.status(400).json({
          success: false,
          message: "Açıklama en fazla 500 karakter olabilir",
        });
      }

      // Set auto renewal date to 1 year from now
      const autoRenewalDate = new Date();
      autoRenewalDate.setFullYear(autoRenewalDate.getFullYear() + 1);

      const service = new Service({
        producer: producerId,
        title,
        description,
        category,
        tags: tags || [],
        images: [],
        isActive: true,
        views: 0,
        offers: 0,
        autoRenewalDate,
      });

      await service.save();

      res.status(201).json({
        success: true,
        message: "Hizmet başarıyla oluşturuldu",
        data: service,
      });
    } catch (error: any) {
      console.error("Error creating service:", error);
      res.status(500).json({
        success: false,
        message: "Hizmet oluşturulamadı",
      });
    }
  }
);

// Update service
router.put(
  "/:id",
  authenticateToken,
  requireProducer,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const producerId = req.user.id;
      const { title, description, category, tags, isActive } = req.body;

      const service = await Service.findOne({ _id: id, producer: producerId });

      if (!service) {
        return res.status(404).json({
          success: false,
          message: "Hizmet bulunamadı",
        });
      }

      // Validation
      if (title && title.length > 70) {
        return res.status(400).json({
          success: false,
          message: "Başlık en fazla 70 karakter olabilir",
        });
      }

      if (description && description.length > 500) {
        return res.status(400).json({
          success: false,
          message: "Açıklama en fazla 500 karakter olabilir",
        });
      }

      // Update fields
      if (title) service.title = title;
      if (description) service.description = description;
      if (category) service.category = category;
      if (tags) service.tags = tags;
      if (typeof isActive === "boolean") service.isActive = isActive;

      await service.save();

      res.json({
        success: true,
        message: "Hizmet başarıyla güncellendi",
        data: service,
      });
    } catch (error: any) {
      console.error("Error updating service:", error);
      res.status(500).json({
        success: false,
        message: "Hizmet güncellenemedi",
      });
    }
  }
);

// Delete service
router.delete(
  "/:id",
  authenticateToken,
  requireProducer,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const producerId = req.user.id;

      const service = await Service.findOne({ _id: id, producer: producerId });

      if (!service) {
        return res.status(404).json({
          success: false,
          message: "Hizmet bulunamadı",
        });
      }

      await Service.deleteOne({ _id: id });

      res.json({
        success: true,
        message: "Hizmet başarıyla silindi",
      });
    } catch (error: any) {
      console.error("Error deleting service:", error);
      res.status(500).json({
        success: false,
        message: "Hizmet silinemedi",
      });
    }
  }
);

// Upload service images
router.post(
  "/:id/upload-images",
  authenticateToken,
  requireProducer,
  uploadImage.array("images", 2),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const producerId = req.user.id;

      const service = await Service.findOne({ _id: id, producer: producerId });

      if (!service) {
        return res.status(404).json({
          success: false,
          message: "Hizmet bulunamadı",
        });
      }

      const files = req.files as Express.Multer.File[];
      const imageUrls = files.map((file: any) => (file as any).location);

      console.log("=== RESİM YÜKLEME VERİLERİ ===");
      console.log("Files count:", files.length);
      console.log(
        "Files:",
        files.map((f) => ({
          name: f.originalname,
          size: f.size,
          location: (f as any).location,
        }))
      );
      console.log("Image URLs:", imageUrls);
      console.log("Current service images:", service.images);
      console.log("Service ID:", service._id);

      service.images = [...service.images, ...imageUrls];
      await service.save();

      console.log("Updated service images:", service.images);
      console.log("Service saved successfully");

      res.json({
        success: true,
        message: "Resimler başarıyla yüklendi",
        data: { imageUrls },
      });
    } catch (error: any) {
      console.error("Error uploading images:", error);
      res.status(500).json({
        success: false,
        message: "Resimler yüklenemedi",
      });
    }
  }
);

// Upload service video
router.post(
  "/:id/upload-video",
  authenticateToken,
  requireProducer,
  uploadVideo.single("video"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const producerId = req.user.id;

      const service = await Service.findOne({ _id: id, producer: producerId });

      if (!service) {
        return res.status(404).json({
          success: false,
          message: "Hizmet bulunamadı",
        });
      }

      const file = req.file as Express.Multer.File;
      const videoUrl = (file as any).location;

      console.log("=== VİDEO YÜKLEME VERİLERİ ===");
      console.log(
        "File:",
        file
          ? {
              name: file.originalname,
              size: file.size,
              location: (file as any).location,
            }
          : "No file"
      );
      console.log("Video URL:", videoUrl);
      console.log("Service ID:", service._id);

      service.videoUrl = videoUrl;
      await service.save();

      console.log("Updated service videoUrl:", service.videoUrl);
      console.log("Service saved successfully");

      res.json({
        success: true,
        message: "Video başarıyla yüklendi",
        data: { videoUrl },
      });
    } catch (error: any) {
      console.error("Error uploading video:", error);
      res.status(500).json({
        success: false,
        message: "Video yüklenemedi",
      });
    }
  }
);

// Delete service image
router.delete(
  "/:id/images/:imageIndex",
  authenticateToken,
  requireProducer,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id, imageIndex } = req.params;
      const producerId = req.user.id;

      const service = await Service.findOne({ _id: id, producer: producerId });

      if (!service) {
        return res.status(404).json({
          success: false,
          message: "Hizmet bulunamadı",
        });
      }

      const index = parseInt(imageIndex);
      if (isNaN(index) || index < 0 || index >= service.images.length) {
        return res.status(400).json({
          success: false,
          message: "Geçersiz resim indeksi",
        });
      }

      // Remove image from array
      service.images.splice(index, 1);
      await service.save();

      console.log("=== RESİM SİLME VERİLERİ ===");
      console.log("Service ID:", service._id);
      console.log("Deleted image index:", index);
      console.log("Remaining images:", service.images);

      res.json({
        success: true,
        message: "Resim başarıyla silindi",
        data: { remainingImages: service.images },
      });
    } catch (error: any) {
      console.error("Error deleting image:", error);
      res.status(500).json({
        success: false,
        message: "Resim silinemedi",
      });
    }
  }
);

// Delete service video
router.delete(
  "/:id/video",
  authenticateToken,
  requireProducer,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const producerId = req.user.id;

      const service = await Service.findOne({ _id: id, producer: producerId });

      if (!service) {
        return res.status(404).json({
          success: false,
          message: "Hizmet bulunamadı",
        });
      }

      // Remove video URL
      service.videoUrl = "";
      await service.save();

      console.log("=== VİDEO SİLME VERİLERİ ===");
      console.log("Service ID:", service._id);
      console.log("Video URL cleared");

      res.json({
        success: true,
        message: "Video başarıyla silindi",
      });
    } catch (error: any) {
      console.error("Error deleting video:", error);
      res.status(500).json({
        success: false,
        message: "Video silinemedi",
      });
    }
  }
);

// Toggle service status
router.patch(
  "/:id/toggle-status",
  authenticateToken,
  requireProducer,
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const producerId = req.user.id;

      const service = await Service.findOne({ _id: id, producer: producerId });

      if (!service) {
        return res.status(404).json({
          success: false,
          message: "Hizmet bulunamadı",
        });
      }

      service.isActive = !service.isActive;
      await service.save();

      res.json({
        success: true,
        message: `Hizmet ${
          service.isActive ? "aktif" : "pasif"
        } hale getirildi`,
        data: service,
      });
    } catch (error: any) {
      console.error("Error toggling service status:", error);
      res.status(500).json({
        success: false,
        message: "Hizmet durumu değiştirilemedi",
      });
    }
  }
);

export default router;
