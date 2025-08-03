import express, { Request, Response } from "express";
import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";
import { authenticateToken } from "../middleware/auth";
import { requireProducer } from "../middleware/roleAuth";
import { Producer } from "../models/Producer.model";
import { Advertisement } from "../models/Advertisement.model";
import { AdvertisementCategory } from "../models/AdvertisementCategory.model";

const router = express.Router();

// Public route to get advertisement categories
router.get("/categories", async (req: Request, res: Response) => {
  try {
    const categories = await AdvertisementCategory.find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .lean();

    res.json({
      success: true,
      data: categories,
    });
  } catch (error: any) {
    console.error("Error fetching advertisement categories:", error);
    res.status(500).json({
      success: false,
      message: "Reklam kategorileri getirilemedi",
    });
  }
});

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
      const fileName = `advertisements/${Date.now()}-${file.originalname}`;
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
      const fileName = `advertisements/videos/${Date.now()}-${
        file.originalname
      }`;
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

// Multer configuration for documents
const uploadDocument = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_S3_BUCKET || "uretix-bucket",
    key: (req, file, cb) => {
      const fileName = `advertisements/documents/${Date.now()}-${
        file.originalname
      }`;
      cb(null, fileName);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Sadece PDF, DOC, DOCX, XLS, XLSX dosyaları kabul edilir"));
    }
  },
});

interface AuthRequest extends Request {
  user?: any;
}

// Apply middleware to all routes
router.use(authenticateToken);
router.use(requireProducer);

// GET all advertisements for the authenticated producer
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { status } = req.query;

    // Find producer by user ID
    const producer = await Producer.findOne({ user: userId });

    if (!producer) {
      return res.status(404).json({
        success: false,
        message: "Producer bulunamadı",
      });
    }

    let query: any = { producer: producer._id };

    // Filter by status
    if (status === "active") {
      query.isActive = true;
    } else if (status === "inactive") {
      query.isActive = false;
    }

    const advertisements = await Advertisement.find(query).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      data: advertisements,
    });
  } catch (error: any) {
    console.error("Error fetching advertisements:", error);
    res.status(500).json({
      success: false,
      message: "Reklamlar getirilemedi",
    });
  }
});

// GET single advertisement by ID
router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Find producer by user ID
    const producer = await Producer.findOne({ user: userId });

    if (!producer) {
      return res.status(404).json({
        success: false,
        message: "Producer bulunamadı",
      });
    }

    const advertisement = await Advertisement.findOne({
      _id: id,
      producer: producer._id,
    });

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: "Reklam bulunamadı",
      });
    }

    res.json({
      success: true,
      data: advertisement,
    });
  } catch (error: any) {
    console.error("Error fetching advertisement:", error);
    res.status(500).json({
      success: false,
      message: "Reklam getirilemedi",
    });
  }
});

// POST create new advertisement
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const advertisementData = req.body;

    // Find producer by user ID
    const producer = await Producer.findOne({ user: userId });

    if (!producer) {
      return res.status(404).json({
        success: false,
        message: "Producer bulunamadı",
      });
    }

    // Validate required fields
    const requiredFields = ["title", "description"];

    const missingFields = requiredFields.filter(
      (field) => !advertisementData[field]
    );

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Eksik alanlar: ${missingFields.join(", ")}`,
      });
    }

    // Set default values for optional fields
    const advertisementToCreate = {
      ...advertisementData,
      producer: producer._id,
      tags: advertisementData.tags || [],
      views: 0,
      clicks: 0,
      isActive:
        advertisementData.isActive !== undefined
          ? advertisementData.isActive
          : true,
    };

    console.log("Advertisement to create:", advertisementToCreate);

    // Create new advertisement
    const advertisement = new Advertisement(advertisementToCreate);

    await advertisement.save();

    res.status(201).json({
      success: true,
      message: "Reklam başarıyla oluşturuldu",
      data: advertisement,
    });
  } catch (error: any) {
    console.error("Error creating advertisement:", error);

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
      message: "Reklam oluşturulamadı",
      error: error.message,
    });
  }
});

// PUT update advertisement
router.put("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
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

    const advertisement = await Advertisement.findOne({
      _id: id,
      producer: producer._id,
    });

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: "Reklam bulunamadı",
      });
    }

    // Update fields
    Object.keys(updateData).forEach((key) => {
      if (
        key !== "_id" &&
        key !== "producer" &&
        key !== "views" &&
        key !== "clicks"
      ) {
        (advertisement as any)[key] = updateData[key];
      }
    });

    await advertisement.save();

    res.json({
      success: true,
      message: "Reklam başarıyla güncellendi",
      data: advertisement,
    });
  } catch (error: any) {
    console.error("Error updating advertisement:", error);
    res.status(500).json({
      success: false,
      message: "Reklam güncellenemedi",
    });
  }
});

// DELETE advertisement
router.delete("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    // Find producer by user ID
    const producer = await Producer.findOne({ user: userId });

    if (!producer) {
      return res.status(404).json({
        success: false,
        message: "Producer bulunamadı",
      });
    }

    const advertisement = await Advertisement.findOneAndDelete({
      _id: id,
      producer: producer._id,
    });

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: "Reklam bulunamadı",
      });
    }

    res.json({
      success: true,
      message: "Reklam başarıyla silindi",
    });
  } catch (error: any) {
    console.error("Error deleting advertisement:", error);
    res.status(500).json({
      success: false,
      message: "Reklam silinemedi",
    });
  }
});

// POST upload cover image for advertisement
router.post(
  "/:id/upload-image",
  uploadImage.single("image"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

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

      const advertisement = await Advertisement.findOne({
        _id: id,
        producer: producer._id,
      });

      if (!advertisement) {
        return res.status(404).json({
          success: false,
          message: "Reklam bulunamadı",
        });
      }

      // Update cover image URL
      advertisement.coverImage = (req.file as any).location;
      await advertisement.save();

      res.json({
        success: true,
        message: "Kapak resmi başarıyla yüklendi",
        data: {
          imageUrl: (req.file as any).location,
        },
      });
    } catch (error: any) {
      console.error("Error uploading cover image:", error);
      res.status(500).json({
        success: false,
        message: "Kapak resmi yüklenemedi",
      });
    }
  }
);

// POST upload video for advertisement
router.post(
  "/:id/upload-video",
  uploadVideo.single("video"),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

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

      const advertisement = await Advertisement.findOne({
        _id: id,
        producer: producer._id,
      });

      if (!advertisement) {
        return res.status(404).json({
          success: false,
          message: "Reklam bulunamadı",
        });
      }

      // Update video URL
      advertisement.videoUrl = (req.file as any).location;
      await advertisement.save();

      res.json({
        success: true,
        message: "Video başarıyla yüklendi",
        data: {
          videoUrl: (req.file as any).location,
        },
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

// POST upload detail images for advertisement
router.post(
  "/:id/upload-detail-images",
  uploadImage.array("images", 5), // Maksimum 5 resim
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "En az bir resim dosyası gerekli",
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

      const advertisement = await Advertisement.findOne({
        _id: id,
        producer: producer._id,
      });

      if (!advertisement) {
        return res.status(404).json({
          success: false,
          message: "Reklam bulunamadı",
        });
      }

      // Get image URLs from uploaded files
      const imageUrls = (req.files as any[]).map((file) => file.location);

      // Add new images to existing ones
      advertisement.detailImages = [
        ...(advertisement.detailImages || []),
        ...imageUrls,
      ];

      await advertisement.save();

      res.json({
        success: true,
        message: "Detay resimleri başarıyla yüklendi",
        data: {
          imageUrls,
        },
      });
    } catch (error: any) {
      console.error("Error uploading detail images:", error);
      res.status(500).json({
        success: false,
        message: "Detay resimleri yüklenemedi",
      });
    }
  }
);

// POST upload documents for advertisement
router.post(
  "/:id/upload-documents",
  uploadDocument.array("documents", 10), // Maksimum 10 doküman
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: "En az bir doküman dosyası gerekli",
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

      const advertisement = await Advertisement.findOne({
        _id: id,
        producer: producer._id,
      });

      if (!advertisement) {
        return res.status(404).json({
          success: false,
          message: "Reklam bulunamadı",
        });
      }

      // Get document URLs from uploaded files
      const documentUrls = (req.files as any[]).map((file) => file.location);

      // Add new documents to existing ones
      advertisement.documents = [
        ...(advertisement.documents || []),
        ...documentUrls,
      ];

      await advertisement.save();

      res.json({
        success: true,
        message: "Dokümanlar başarıyla yüklendi",
        data: {
          documentUrls,
        },
      });
    } catch (error: any) {
      console.error("Error uploading documents:", error);
      res.status(500).json({
        success: false,
        message: "Dokümanlar yüklenemedi",
      });
    }
  }
);

export default router;
