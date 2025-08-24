import express, { Request, Response } from "express";
import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";
import { authenticateToken } from "../middleware/auth";
import { requireProducer } from "../middleware/roleAuth";
import { Producer } from "../models/Producer.model";
import { ProductionListing } from "../models/ProductionListing.model";

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
      const fileName = `production-listings/${Date.now()}-${file.originalname}`;
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
      const fileName = `production-listings/videos/${Date.now()}-${
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
      const fileName = `production-listings/documents/${Date.now()}-${
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

// GET all production listings for the authenticated producer
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    // Find producer by user ID
    const producer = await Producer.findOne({ user: userId });

    if (!producer) {
      return res.status(404).json({
        success: false,
        message: "Producer bulunamadı",
      });
    }

    const productionListings = await ProductionListing.find({
      producer: producer._id,
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: productionListings,
    });
  } catch (error: any) {
    console.error("Error fetching production listings:", error);
    res.status(500).json({
      success: false,
      message: "Üretim ilanları getirilemedi",
    });
  }
});

// GET single production listing by ID
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

    const productionListing = await ProductionListing.findOne({
      _id: id,
      producer: producer._id,
    });

    if (!productionListing) {
      return res.status(404).json({
        success: false,
        message: "Üretim ilanı bulunamadı",
      });
    }

    res.json({
      success: true,
      data: productionListing,
    });
  } catch (error: any) {
    console.error("Error fetching production listing:", error);
    res.status(500).json({
      success: false,
      message: "Üretim ilanı getirilemedi",
    });
  }
});

// POST create new production listing
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const productionListingData = req.body;

    // Find producer by user ID
    const producer = await Producer.findOne({ user: userId });

    if (!producer) {
      return res.status(404).json({
        success: false,
        message: "Producer bulunamadı",
      });
    }

    // Validate required fields
    const requiredFields = [
      "title",
      "type",
      "technicalDetails",
      "productionQuantity",
      "logisticsModel",
    ];

    const missingFields = requiredFields.filter(
      (field) => !productionListingData[field]
    );

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Eksik alanlar: ${missingFields.join(", ")}`,
      });
    }

    // Set default values for optional fields
    const productionListingToCreate = {
      ...productionListingData,
      producer: producer._id,
      benefits: productionListingData.benefits || [],
      applications: [],
      isActive:
        productionListingData.isActive !== undefined
          ? productionListingData.isActive
          : true,
    };

    console.log("Production listing to create:", productionListingToCreate);

    // Create new production listing
    const productionListing = new ProductionListing(productionListingToCreate);

    await productionListing.save();

    res.status(201).json({
      success: true,
      message: "Üretim ilanı başarıyla oluşturuldu",
      data: productionListing,
    });
  } catch (error: any) {
    console.error("Error creating production listing:", error);

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
      message: "Üretim ilanı oluşturulamadı",
      error: error.message,
    });
  }
});

// PUT update production listing
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

    const productionListing = await ProductionListing.findOne({
      _id: id,
      producer: producer._id,
    });

    if (!productionListing) {
      return res.status(404).json({
        success: false,
        message: "Üretim ilanı bulunamadı",
      });
    }

    // Update fields
    Object.keys(updateData).forEach((key) => {
      if (key !== "_id" && key !== "producer" && key !== "applications") {
        (productionListing as any)[key] = updateData[key];
      }
    });

    await productionListing.save();

    res.json({
      success: true,
      message: "Üretim ilanı başarıyla güncellendi",
      data: productionListing,
    });
  } catch (error: any) {
    console.error("Error updating production listing:", error);
    res.status(500).json({
      success: false,
      message: "Üretim ilanı güncellenemedi",
    });
  }
});

// DELETE production listing
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

    const productionListing = await ProductionListing.findOneAndDelete({
      _id: id,
      producer: producer._id,
    });

    if (!productionListing) {
      return res.status(404).json({
        success: false,
        message: "Üretim ilanı bulunamadı",
      });
    }

    res.json({
      success: true,
      message: "Üretim ilanı başarıyla silindi",
    });
  } catch (error: any) {
    console.error("Error deleting production listing:", error);
    res.status(500).json({
      success: false,
      message: "Üretim ilanı silinemedi",
    });
  }
});

// POST upload cover image for production listing
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

      const productionListing = await ProductionListing.findOne({
        _id: id,
        producer: producer._id,
      });

      if (!productionListing) {
        return res.status(404).json({
          success: false,
          message: "Üretim ilanı bulunamadı",
        });
      }

      // Update cover image URL
      productionListing.coverImage = (req.file as any).location;
      await productionListing.save();

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

// POST upload video for production listing
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

      const productionListing = await ProductionListing.findOne({
        _id: id,
        producer: producer._id,
      });

      if (!productionListing) {
        return res.status(404).json({
          success: false,
          message: "Üretim ilanı bulunamadı",
        });
      }

      // Update video URL
      productionListing.videoUrl = (req.file as any).location;
      await productionListing.save();

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

// POST upload detail images for production listing
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

      const productionListing = await ProductionListing.findOne({
        _id: id,
        producer: producer._id,
      });

      if (!productionListing) {
        return res.status(404).json({
          success: false,
          message: "Üretim ilanı bulunamadı",
        });
      }

      // Get image URLs from uploaded files
      const imageUrls = (req.files as any[]).map((file) => file.location);

      // Add new images to existing ones
      productionListing.detailImages = [
        ...(productionListing.detailImages || []),
        ...imageUrls,
      ];

      await productionListing.save();

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

// POST upload documents for production listing
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

      const productionListing = await ProductionListing.findOne({
        _id: id,
        producer: producer._id,
      });

      if (!productionListing) {
        return res.status(404).json({
          success: false,
          message: "Üretim ilanı bulunamadı",
        });
      }

      // Get document URLs from uploaded files
      const documentUrls = (req.files as any[]).map((file) => file.location);

      // Add new documents to existing ones
      productionListing.documents = [
        ...(productionListing.documents || []),
        ...documentUrls,
      ];

      await productionListing.save();

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
