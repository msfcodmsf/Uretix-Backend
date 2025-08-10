import express, { Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import { requireProducer } from "../middleware/roleAuth";
import { uploadSingle, deleteFromS3 } from "../config/s3";
import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";
import {
  Product,
  Producer,
  ProductionCategory,
  MaterialType,
  UsageArea,
} from "../models";

interface AuthRequest extends Request {
  user?: any;
}

// S3 Client for image uploads
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const router = express.Router();

// GET product categories (ana kategoriler - parentCategory olmayan)
router.get("/categories", async (req: Request, res: Response) => {
  try {
    const categories = await ProductionCategory.find({
      isActive: true,
      type: "vitrin",
      vitrinCategory: "uretim",
      parentCategory: { $exists: false },
    }).sort({
      name: 1,
    });

    res.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    res.status(500).json({
      success: false,
      message: "Kategoriler getirilemedi",
    });
  }
});

// GET sub categories for a specific parent category
router.get(
  "/categories/:parentId/subcategories",
  async (req: Request, res: Response) => {
    try {
      const { parentId } = req.params;

      const subCategories = await ProductionCategory.find({
        parentCategory: parentId,
        isActive: true,
        type: "vitrin",
        vitrinCategory: "uretim",
      }).sort({
        name: 1,
      });

      res.json({
        success: true,
        data: subCategories,
      });
    } catch (error) {
      console.error("Error fetching sub categories:", error);
      res.status(500).json({
        success: false,
        message: "Alt kategoriler getirilemedi",
      });
    }
  }
);

// GET sub-sub categories for a specific sub category
router.get(
  "/categories/:subId/sub-subcategories",
  async (req: Request, res: Response) => {
    try {
      const { subId } = req.params;

      const subSubCategories = await ProductionCategory.find({
        parentCategory: subId,
        isActive: true,
        type: "vitrin",
        vitrinCategory: "uretim",
      }).sort({
        name: 1,
      });

      res.json({
        success: true,
        data: subSubCategories,
      });
    } catch (error) {
      console.error("Error fetching sub-sub categories:", error);
      res.status(500).json({
        success: false,
        message: "Alt-alt kategoriler getirilemedi",
      });
    }
  }
);

// GET material types
router.get("/material-types", async (req: Request, res: Response) => {
  try {
    const materialTypes = await MaterialType.find({ isActive: true }).sort({
      order: 1,
      name: 1,
    });

    res.json({
      success: true,
      data: materialTypes,
    });
  } catch (error) {
    console.error("Error fetching material types:", error);
    res.status(500).json({
      success: false,
      message: "Malzeme tipleri getirilemedi",
    });
  }
});

// GET usage areas
router.get("/usage-areas", async (req: Request, res: Response) => {
  try {
    const usageAreas = await UsageArea.find({ isActive: true }).sort({
      order: 1,
      name: 1,
    });

    res.json({
      success: true,
      data: usageAreas,
    });
  } catch (error) {
    console.error("Error fetching usage areas:", error);
    res.status(500).json({
      success: false,
      message: "Kullanım alanları getirilemedi",
    });
  }
});

// Middleware to ensure producer access for protected routes
router.use(authenticateToken);
router.use(requireProducer);

// GET all products for producer
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

    const products = await Product.find({ producer: producer._id })
      .sort({ createdAt: -1 })
      .populate("producer", "companyName");

    res.json({
      success: true,
      data: products,
    });
  } catch (error: any) {
    console.error("Error fetching products:", error);
    res.status(500).json({
      success: false,
      message: "Ürünler getirilemedi",
    });
  }
});

// GET single product (public - no authentication required)
router.get("/public/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id).populate(
      "producer",
      "companyName"
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Ürün bulunamadı",
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error: any) {
    console.error("Error fetching product:", error);
    res.status(500).json({
      success: false,
      message: "Ürün getirilemedi",
    });
  }
});

// GET single product (authenticated - for producers to access their own products)
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

    const product = await Product.findOne({
      _id: id,
      producer: producer._id,
    }).populate("producer", "companyName");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Ürün bulunamadı",
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error: any) {
    console.error("Error fetching product:", error);
    res.status(500).json({
      success: false,
      message: "Ürün getirilemedi",
    });
  }
});

// POST create product
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const productData = req.body;

    console.log("Creating product with data:", productData);

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
      "name",
      "shortDescription",
      "description",
      "category",
      "subCategory",
      "availableQuantity",
      "materialType",
      "dimensions",
      "weight",
      "estimatedDeliveryTime",
      "shippingMethod",
    ];

    const missingFields = requiredFields.filter((field) => {
      const value = productData[field];
      return value === undefined || value === null || value === "";
    });

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Eksik alanlar: ${missingFields.join(", ")}`,
        missingFields,
      });
    }

    // Validate dimensions
    if (
      !productData.dimensions.height ||
      !productData.dimensions.width ||
      !productData.dimensions.depth
    ) {
      return res.status(400).json({
        success: false,
        message: "Ürün boyutları (yükseklik, genişlik, derinlik) gereklidir",
      });
    }

    // Set default values for optional fields
    const productToCreate = {
      ...productData,
      producer: producer._id,
      coverImage:
        productData.coverImage ||
        "https://via.placeholder.com/400x300?text=No+Image",
      images: productData.images || [],
      videoUrl: productData.videoUrl || "",
      productVariants: productData.productVariants || [],
      usageAreas: productData.usageAreas || [],
      nonDeliveryRegions: productData.nonDeliveryRegions || [],
      discounts: productData.discounts || [],
      specifications: productData.specifications || {},
      tags: productData.tags || [],
      isActive:
        productData.isActive !== undefined ? productData.isActive : true,
      isFeatured:
        productData.isFeatured !== undefined ? productData.isFeatured : false,
      rating: 0,
      totalRatings: 0,
    };

    console.log("Product to create:", productToCreate);

    // Create new product
    const product = new Product(productToCreate);

    await product.save();

    res.status(201).json({
      success: true,
      message: "Ürün başarıyla oluşturuldu",
      data: product,
    });
  } catch (error: any) {
    console.error("Error creating product:", error);

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
      message: "Ürün oluşturulamadı",
      error: error.message,
    });
  }
});

// PUT update product
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

    const product = await Product.findOneAndUpdate(
      {
        _id: id,
        producer: producer._id,
      },
      updateData,
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Ürün bulunamadı",
      });
    }

    res.json({
      success: true,
      message: "Ürün başarıyla güncellendi",
      data: product,
    });
  } catch (error: any) {
    console.error("Error updating product:", error);
    res.status(500).json({
      success: false,
      message: "Ürün güncellenemedi",
    });
  }
});

// DELETE product
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

    const product = await Product.findOneAndDelete({
      _id: id,
      producer: producer._id,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Ürün bulunamadı",
      });
    }

    res.json({
      success: true,
      message: "Ürün başarıyla silindi",
    });
  } catch (error: any) {
    console.error("Error deleting product:", error);
    res.status(500).json({
      success: false,
      message: "Ürün silinemedi",
    });
  }
});

// POST upload product cover image
router.post("/:id/cover-image", async (req: AuthRequest, res: Response) => {
  const uploadCoverImage = multer({
    storage: multerS3({
      s3: s3Client,
      bucket: process.env.AWS_S3_BUCKET_NAME || "uretix-bucket",
      metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname });
      },
      key: function (req, file, cb) {
        const fileName = `products/cover/${Date.now()}-${file.originalname}`;
        cb(null, fileName);
      },
      acl: "public-read",
      contentType: function (req, file, cb) {
        cb(null, file.mimetype);
      },
    }),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith("image/")) {
        cb(null, true);
      } else {
        cb(new Error("Sadece resim dosyaları kabul edilir"));
      }
    },
  }).single("coverImage");

  uploadCoverImage(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: "Resim yükleme hatası",
        error: err.message,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Resim dosyası seçilmedi",
      });
    }

    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const file = req.file as any;

      // Find producer by user ID
      const producer = await Producer.findOne({ user: userId });

      if (!producer) {
        return res.status(404).json({
          success: false,
          message: "Producer bulunamadı",
        });
      }

      const product = await Product.findOne({
        _id: id,
        producer: producer._id,
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Ürün bulunamadı",
        });
      }

      // Eski cover image'ı sil
      if (product.coverImage) {
        try {
          const oldImageKey = product.coverImage.split("/").pop();
          if (oldImageKey) {
            await deleteFromS3(`products/cover/${oldImageKey}`);
          }
        } catch (deleteError) {
          console.error("Eski resim silinirken hata:", deleteError);
        }
      }

      // Yeni cover image'ı güncelle
      product.coverImage = file.location;
      await product.save();

      res.json({
        success: true,
        message: "Ürün kapağı başarıyla yüklendi",
        data: {
          coverImageUrl: file.location,
        },
      });
    } catch (error) {
      console.error("Cover image upload error:", error);
      res.status(500).json({
        success: false,
        message: "Ürün kapağı yüklenirken hata oluştu",
      });
    }
  });
});

// POST upload product detail images
router.post("/:id/detail-images", async (req: AuthRequest, res: Response) => {
  const uploadDetailImages = multer({
    storage: multerS3({
      s3: s3Client,
      bucket: process.env.AWS_S3_BUCKET_NAME || "uretix-bucket",
      metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname });
      },
      key: function (req, file, cb) {
        const fileName = `products/detail/${Date.now()}-${file.originalname}`;
        cb(null, fileName);
      },
      acl: "public-read",
      contentType: function (req, file, cb) {
        cb(null, file.mimetype);
      },
    }),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith("image/")) {
        cb(null, true);
      } else {
        cb(new Error("Sadece resim dosyaları kabul edilir"));
      }
    },
  }).array("detailImages", 5); // Maksimum 5 dosya

  uploadDetailImages(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: "Resim yükleme hatası",
        error: err.message,
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Resim dosyası seçilmedi",
      });
    }

    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const files = req.files as any[];

      // Find producer by user ID
      const producer = await Producer.findOne({ user: userId });

      if (!producer) {
        return res.status(404).json({
          success: false,
          message: "Producer bulunamadı",
        });
      }

      const product = await Product.findOne({
        _id: id,
        producer: producer._id,
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Ürün bulunamadı",
        });
      }

      // Yeni detay resimlerini ekle
      const newImageUrls = files.map((file) => file.location);
      product.images = [...product.images, ...newImageUrls];

      // Maksimum 5 resim kontrolü
      if (product.images.length > 5) {
        product.images = product.images.slice(0, 5);
      }

      await product.save();

      res.json({
        success: true,
        message: "Detay resimleri başarıyla yüklendi",
        data: {
          detailImageUrls: newImageUrls,
          totalImages: product.images.length,
        },
      });
    } catch (error: any) {
      console.error("Detail images upload error:", error);
      res.status(500).json({
        success: false,
        message: "Detay resimleri yüklenirken hata oluştu",
      });
    }
  });
});

// POST upload product video
router.post("/:id/video", async (req: AuthRequest, res: Response) => {
  const uploadVideo = multer({
    storage: multerS3({
      s3: s3Client,
      bucket: process.env.AWS_S3_BUCKET_NAME || "uretix-bucket",
      metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname });
      },
      key: function (req, file, cb) {
        const fileName = `products/videos/${Date.now()}-${file.originalname}`;
        cb(null, fileName);
      },
      acl: "public-read",
      contentType: function (req, file, cb) {
        cb(null, file.mimetype);
      },
    }),
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB limit
    },
    fileFilter: (req, file, cb) => {
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
      const { id } = req.params;
      const file = req.file as any;

      // Find producer by user ID
      const producer = await Producer.findOne({ user: userId });

      if (!producer) {
        return res.status(404).json({
          success: false,
          message: "Producer bulunamadı",
        });
      }

      const product = await Product.findOne({
        _id: id,
        producer: producer._id,
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Ürün bulunamadı",
        });
      }

      // Eski videoyu sil
      if (product.videoUrl) {
        try {
          const oldVideoKey = product.videoUrl.split("/").pop();
          if (oldVideoKey) {
            await deleteFromS3(`products/videos/${oldVideoKey}`);
          }
        } catch (deleteError) {
          console.error("Eski video silinirken hata:", deleteError);
        }
      }

      // Yeni videoyu güncelle
      product.videoUrl = file.location;
      await product.save();

      res.json({
        success: true,
        message: "Ürün videosu başarıyla yüklendi",
        data: {
          videoUrl: file.location,
        },
      });
    } catch (error: any) {
      console.error("Video upload error:", error);
      res.status(500).json({
        success: false,
        message: "Ürün videosu yüklenirken hata oluştu",
      });
    }
  });
});

// DELETE product image
router.delete("/:id/images", async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const { imageUrl, imageType } = req.body; // imageType: 'cover', 'detail', 'video'

    // Find producer by user ID
    const producer = await Producer.findOne({ user: userId });

    if (!producer) {
      return res.status(404).json({
        success: false,
        message: "Producer bulunamadı",
      });
    }

    const product = await Product.findOne({
      _id: id,
      producer: producer._id,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Ürün bulunamadı",
      });
    }

    // S3'ten dosyayı sil
    try {
      if (imageUrl) {
        const fileKey = imageUrl.split("/").pop();
        if (fileKey) {
          let s3Key = "";
          if (imageType === "cover") {
            s3Key = `products/cover-images/${fileKey}`;
          } else if (imageType === "detail") {
            s3Key = `products/detail-images/${fileKey}`;
          } else if (imageType === "video") {
            s3Key = `products/videos/${fileKey}`;
          }

          if (s3Key) {
            await deleteFromS3(s3Key);
          }
        }
      }
    } catch (deleteError) {
      console.error("Dosya silinirken hata:", deleteError);
    }

    // Veritabanından kaldır
    if (imageType === "cover") {
      product.coverImage = "";
    } else if (imageType === "detail") {
      product.images = product.images.filter((img: string) => img !== imageUrl);
    } else if (imageType === "video") {
      product.videoUrl = "";
    }

    await product.save();

    res.json({
      success: true,
      message: "Dosya başarıyla silindi",
    });
  } catch (error: any) {
    console.error("Dosya silme hatası:", error);
    res.status(500).json({
      success: false,
      message: "Dosya silinirken hata oluştu",
    });
  }
});

export default router;
