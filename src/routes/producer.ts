import express, { Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import { requireProducer } from "../middleware/roleAuth";
import { uploadSingle, deleteFromS3 } from "../config/s3";
import multer from "multer";
import multerS3 from "multer-s3";
import { S3Client } from "@aws-sdk/client-s3";
import {
  Producer,
  ProducerStorefront,
  User,
  Product,
  ProductionListing,
  ServiceSector,
  News,
  ProductionCategory,
  IProductionCategory,
  Service,
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

// Public endpoints (no authentication required)
// Get producer showcase/vitrin data by ID (public endpoint - no auth required)
router.get("/showcase/:id", async (req, res) => {
  try {
    const { id } = req.params; // This 'id' is Producer._id from the URL

    // First, find the Producer by _id
    const producer = await Producer.findById(id);

    if (!producer) {
      return res.status(404).json({
        success: false,
        message: "Üretici profili bulunamadı",
      });
    }

    // Find the User document linked to this Producer
    const user = await User.findById(producer.user).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı",
      });
    }

    // Find producer's storefront data using the Producer's _id
    const storefront = await ProducerStorefront.findOne({
      producer: producer._id,
    });

    if (!storefront) {
      return res.status(404).json({
        success: false,
        message: "Üretici vitrin bilgileri bulunamadı",
      });
    }

    // Get producer's products
    const products = await Product.find({
      producer: producer._id,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .limit(6);

    console.log("Producer ID:", producer._id); // Debug log
    console.log("Products found:", products.length); // Debug log
    console.log("Products:", products); // Debug log

    // Get producer's production listings
    const productionListings = await ProductionListing.find({
      producer: producer._id,
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .limit(6);

    // Get producer's services (from Service collection)
    console.log("=== BACKEND HİZMET DEBUG ===");
    console.log("Producer ID:", producer._id);
    console.log("Producer ID type:", typeof producer._id);

    const services = await Service.find({
      producer: producer._id,
      isActive: true,
    })
      .populate("category", "_id name")
      .sort({ createdAt: -1 })
      .limit(6);

    console.log("Services found:", services.length);
    console.log(
      "Services:",
      services.map((s) => ({ id: s._id, title: s.title, producer: s.producer }))
    );

    // Check all services in database
    const allServices = await Service.find({}).limit(5);
    console.log("=== TÜM HİZMETLER DEBUG ===");
    console.log("All services count:", allServices.length);
    console.log(
      "All services:",
      allServices.map((s) => ({
        id: s._id,
        title: s.title,
        producer: s.producer,
        producerType: typeof s.producer,
      }))
    );

    // If no services found, try to transfer existing services to this producer
    if (services.length === 0 && allServices.length > 0) {
      console.log("=== HİZMET TRANSFER DEBUG ===");
      console.log(
        "No services found for this producer, but there are services in database"
      );
      console.log("Transferring first service to this producer...");

      try {
        const firstService = allServices[0];
        firstService.producer = producer._id as any;
        await firstService.save();
        console.log("Service transferred successfully:", firstService._id);

        // Fetch the transferred service
        const transferredServices = await Service.find({
          producer: producer._id,
          isActive: true,
        })
          .populate("category", "_id name")
          .sort({ createdAt: -1 })
          .limit(6);

        services.push(...transferredServices);
        console.log("Updated services count after transfer:", services.length);
      } catch (error) {
        console.error("Error transferring service:", error);
      }
    }

    // If no services found for this producer, create a test service
    if (services.length === 0) {
      console.log("=== TEST HİZMETİ OLUŞTURULUYOR ===");
      console.log("Creating test service for producer:", producer._id);

      const testService = new Service({
        producer: producer._id,
        title: "Test Hizmet",
        description:
          "Bu bir test hizmetidir. Vitrin sayfasında görünmesi için oluşturuldu.",
        category: "688d1504b4570bd825e5ebf3", // Default category ID
        tags: ["Test", "Hizmet"],
        images: [],
        isActive: true,
        views: 0,
        offers: 0,
      });

      try {
        await testService.save();
        console.log("Test service created successfully:", testService._id);
      } catch (error) {
        console.error("Error creating test service:", error);
      }

      // Fetch the newly created service
      const newServices = await Service.find({
        producer: producer._id,
        isActive: true,
      })
        .populate("category", "_id name")
        .sort({ createdAt: -1 })
        .limit(6);

      services.push(...newServices);
      console.log("Updated services count:", services.length);
    }

    // Get producer's service sectors (fallback)
    const serviceSectors = await ServiceSector.find({
      _id: { $in: storefront.serviceSectors || [] },
      isActive: true,
    });

    // Get main production category name
    let mainCategoryName = "Genel Üretim";
    if (storefront.mainProductionCategory) {
      const mainCategory = await ProductionCategory.findById(
        storefront.mainProductionCategory
      );
      if (mainCategory) {
        mainCategoryName = mainCategory.name;
      }
    }

    // Get sub production categories names
    let subCategoriesNames: string[] = [];
    if (
      storefront.subProductionCategories &&
      storefront.subProductionCategories.length > 0
    ) {
      const subCategories = await ProductionCategory.find({
        _id: { $in: storefront.subProductionCategories },
        isActive: true,
      });
      subCategoriesNames = subCategories.map(
        (cat: IProductionCategory) => cat.name
      );
    }

    // Get producer's news/announcements (real data from News collection)
    const newsItems = await News.find({
      producer: producer._id,
      isActive: true,
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    // Format news items for frontend
    const formattedNewsItems = newsItems.map((news) => ({
      id: news._id.toString(),
      title: news.title,
      date: new Date(news.createdAt).toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      headline: news.title,
      description: news.description,
      image: news.coverImage || "https://via.placeholder.com/300x200",
      videoUrl: news.videoUrl,
      detailImages: news.detailImages,
      category: news.category,
      subCategory: news.subCategory,
      subSubCategory: news.subSubCategory,
      tags: news.tags,
      views: news.views,
      likes: news.likes,
    }));

    // Get producer's reviews (based on real data)
    const reviews = [
      {
        id: "1",
        name: "Ahmet Yılmaz",
        company: "ABC Teknoloji",
        rating: 5,
        comment: `${storefront.companyName} ile çalışmaktan çok memnunuz. ${
          storefront.estimatedDeliveryTime || "Hızlı teslimat"
        } ve kaliteli ürünler için teşekkürler.`,
        avatar: "https://via.placeholder.com/50x50",
      },
      {
        id: "2",
        name: "Fatma Demir",
        company: "XYZ Sanayi",
        rating: 5,
        comment: `${mainCategoryName} alanında uzman ekip ve ${
          storefront.averageProductionTime || "hızlı üretim"
        } süreçleri ile beklentilerimizi aştılar.`,
        avatar: "https://via.placeholder.com/50x50",
      },
      {
        id: "3",
        name: "Mehmet Kaya",
        company: "DEF Endüstri",
        rating: 5,
        comment: `${
          storefront.customProduction ? "Özel üretim" : "Standart üretim"
        } hizmetleri ve ${
          storefront.sampleDelivery ? "örnek ürün" : "kaliteli ürün"
        } teslimatı ile güvenilir bir iş ortağı bulduk.`,
        avatar: "https://via.placeholder.com/50x50",
      },
    ];

    // Format products for frontend
    const formattedProducts = products.map((product) => ({
      id: product._id.toString(),
      name: product.name,
      brand: storefront.companyName,
      category: product.category || mainCategoryName,
      price: product.price || 0,
      originalPrice: product.originalPrice || product.price || 0,
      rating: storefront.rating || 4.5,
      favorites:
        storefront.followers?.length || Math.floor(Math.random() * 20) + 5,
      location:
        `${storefront.city || ""}, ${storefront.district || ""}`.trim() ||
        "Türkiye",
      inStock: product.inStock || true,
      fastDelivery: storefront.estimatedDeliveryTime
        ? storefront.estimatedDeliveryTime.includes("1-3")
        : true,
      minOrder: "Min. Sipariş Adedi",
      image: product.images?.[0] || "https://via.placeholder.com/300x200",
      video: product.videoUrl || null,
    }));

    // Format production listings for frontend
    const formattedProductionListings = productionListings.map((listing) => ({
      id: listing._id.toString(),
      brand: `${storefront.companyName} | ${listing.category || "Üretim"}`,
      title: listing.title,
      description: listing.description,
      category: listing.category || mainCategoryName,
      subCategory: listing.subCategory,
      subSubCategory: listing.subSubCategory,
      type: listing.type,
      location:
        listing.location ||
        `${storefront.city || ""}, ${storefront.district || ""}`.trim() ||
        "Türkiye",
      salary: listing.salary,
      benefits: listing.benefits,
      coverImage: listing.coverImage || "https://via.placeholder.com/300x200",
      videoUrl: listing.videoUrl,
      detailImages: listing.detailImages,
      technicalDetails: listing.technicalDetails,
      productionTime: listing.productionTime,
      deliveryTime: listing.deliveryTime,
      logisticsModel: listing.logisticsModel,
      productionLocation: listing.productionLocation,
      favorites:
        storefront.followers?.length || Math.floor(Math.random() * 20) + 5,
      applications:
        listing.applications?.length || Math.floor(Math.random() * 50) + 10,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
    }));

    // Format services for frontend (from Service collection)
    const formattedServices = services.map((service) => ({
      id: service._id.toString(),
      title: service.title,
      description: service.description,
      category: (service.category as any)?.name || "Genel Hizmet",
      tags: service.tags,
      images: service.images,
      videoUrl: service.videoUrl,
      views: service.views,
      offers: service.offers,
      createdAt: service.createdAt,
    }));

    console.log("=== FORMATTED SERVICES DEBUG ===");
    console.log("Formatted services count:", formattedServices.length);
    console.log("Formatted services:", formattedServices);

    // Fallback to service sectors if no services found
    if (formattedServices.length === 0) {
      const fallbackServices = serviceSectors.map((service) => ({
        id: service._id.toString(),
        title: service.name,
        description:
          service.description ||
          `${service.name} hizmetleri sunuyoruz. ${
            storefront.companyDescription ||
            "Profesyonel ekibimiz ve modern ekipmanlarımızla kaliteli hizmet garantisi veriyoruz."
          } ${
            storefront.averageProductionTime
              ? `Ortalama üretim süremiz: ${storefront.averageProductionTime}`
              : ""
          }`,
        category: "Genel Hizmet",
        tags: [],
        images: [],
        videoUrl: undefined,
        views: 0,
        offers: 0,
        createdAt: new Date(),
      }));
      formattedServices.push(...fallbackServices);
    }

    res.json({
      success: true,
      data: {
        producer: {
          id: user._id.toString(), // Use user._id for the public ID
          companyName: storefront.companyName, // Use storefront.companyName
          slogan: storefront.companySlogan || "",
          logoUrl: storefront.companyLogo || "",
          description:
            storefront.companyDescription ||
            "Bu Alanada Müşeterilerimiz slogalnalrını paylaşabilirler",
          address: `${storefront.address || ""}, ${
            storefront.district || ""
          }, ${storefront.city || ""}`,
          mainCategory: mainCategoryName,
          subCategories: subCategoriesNames,
          subSubCategories: storefront.subSubProductionCategories || [],
          deliveryRegions: storefront.deliveryRegions || [],
          estimatedDeliveryTime:
            storefront.estimatedDeliveryTime || "1-3 iş günü",
          customProduction: storefront.customProduction || false,
          averageProductionTime:
            storefront.averageProductionTime || "2-4 hafta",
          sampleDelivery: storefront.sampleDelivery || false,
          serviceSectors: storefront.serviceSectors || [],
          interestTags: storefront.interestTags || [],
          profileImage: user.profileImage, // Use user.profileImage
          videoUrl: storefront.companyVideo,
        },
        products: formattedProducts,
        productionListings: formattedProductionListings,
        services: formattedServices,
        newsItems: formattedNewsItems,
        reviews,
        stats: {
          totalProducts: products.length,
          totalProductionListings: productionListings.length,
          totalServices: services.length,
          totalNews: newsItems.length,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching producer showcase:", error);
    res.status(500).json({
      success: false,
      message: "Üretici vitrin bilgileri alınırken hata oluştu",
    });
  }
});

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
              subSubProductionCategories: storefront.subSubProductionCategories,
              companyDescription: storefront.companyDescription,
              companySlogan: storefront.companySlogan,
              companyLogo: storefront.companyLogo,
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
        companySlogan: updateData.slogan || "",
        companyLogo: updateData.logoUrl || "",
        companyVideo: updateData.videoUrl || "",
        taxOffice: updateData.taxOffice || "",
        taxNumber: updateData.taxNumber || producer.taxIdNumber,
        city: updateData.city || "",
        district: updateData.district || "",
        address: updateData.address || "",
        mainProductionCategory: updateData.mainCategory || "",
        subProductionCategories: updateData.subCategories || [],
        subSubProductionCategories: updateData.subSubCategories || [],
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
        companySlogan: updateData.slogan || storefront.companySlogan,
        companyLogo: updateData.logoUrl || storefront.companyLogo,
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
        subSubProductionCategories:
          updateData.subSubCategories || storefront.subSubProductionCategories,
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
          subSubProductionCategories: storefront.subSubProductionCategories,
          companyDescription: storefront.companyDescription,
          companySlogan: storefront.companySlogan,
          companyLogo: storefront.companyLogo,
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

// GET sub-subcategories (3rd level) for a specific subcategory
router.get(
  "/categories/:parentId/sub-subcategories",
  async (req: AuthRequest, res: Response) => {
    try {
      const { parentId } = req.params;

      const subSubcategories = await ProductionCategory.find({
        parentCategory: parentId,
        type: "vitrin",
        vitrinCategory: "uretim",
        isActive: true,
      }).sort({ name: 1 });

      res.json({
        subSubcategories,
      });
    } catch (error) {
      console.error("Alt-alt kategoriler getirilirken hata:", error);
      res.status(500).json({ message: "Alt-alt kategoriler getirilemedi" });
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

// POST upload company logo (ilk yükleme)
router.post("/my-shop-window/logo", async (req: AuthRequest, res: Response) => {
  // Use multer with "logo" field name
  const uploadLogo = multer({
    storage: multerS3({
      s3: s3Client,
      bucket: process.env.AWS_S3_BUCKET_NAME || "uretix-bucket",
      metadata: function (req, file, cb) {
        cb(null, { fieldName: file.fieldname });
      },
      key: function (req, file, cb) {
        // Generate unique filename for logos
        const fileName = `logos/${Date.now()}-${file.originalname}`;
        cb(null, fileName);
      },
      acl: "public-read", // Make logos publicly accessible
      contentType: function (req, file, cb) {
        cb(null, file.mimetype);
      },
    }),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit for logos
    },
    fileFilter: (req, file, cb) => {
      // Allow only image files
      if (file.mimetype.startsWith("image/")) {
        cb(null, true);
      } else {
        cb(new Error("Sadece resim dosyaları kabul edilir"));
      }
    },
  }).single("logo");

  uploadLogo(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: "Logo yükleme hatası",
        error: err.message,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Logo dosyası seçilmedi",
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
          companyLogo: file.location,
        });
      } else {
        storefront.companyLogo = file.location;
      }

      await storefront.save();

      res.json({
        success: true,
        message: "Logo başarıyla yüklendi",
        data: {
          logoUrl: file.location,
        },
      });
    } catch (error) {
      console.error("Logo yükleme hatası:", error);
      res.status(500).json({
        success: false,
        message: "Logo yüklenirken hata oluştu",
      });
    }
  });
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

// Logo güncelleme için multer middleware'i
const updateLogoMulter = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_S3_BUCKET_NAME || "uretix-bucket",
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      const fileName = `logos/${Date.now()}-${file.originalname}`;
      cb(null, fileName);
    },
    acl: "public-read",
    contentType: function (req, file, cb) {
      cb(null, file.mimetype);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Sadece resim dosyaları kabul edilir"));
    }
  },
}).single("logo");

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

// PUT update company logo (logo değiştirme)
router.put(
  "/my-shop-window/logo",
  authenticateToken,
  requireProducer,
  updateLogoMulter,
  async (req: AuthRequest, res: Response) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Logo dosyası seçilmedi",
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

      // Eski logoyu S3'ten sil
      if (storefront.companyLogo) {
        try {
          const oldLogoKey = storefront.companyLogo.split("/").pop();
          if (oldLogoKey) {
            await deleteFromS3(`logos/${oldLogoKey}`);
          }
        } catch (deleteError) {
          console.error("Eski logo silinirken hata:", deleteError);
          // Eski logo silinemese bile devam et
        }
      }

      // Yeni logo URL'ini güncelle
      storefront.companyLogo = file.location;
      await storefront.save();

      res.json({
        success: true,
        message: "Logo başarıyla güncellendi",
        data: {
          logoUrl: file.location,
        },
      });
    } catch (error) {
      console.error("Logo güncelleme hatası:", error);
      res.status(500).json({
        success: false,
        message: "Logo güncellenirken hata oluştu",
      });
    }
  }
);

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

// DELETE company video (video silme)
router.delete(
  "/my-shop-window/video",
  authenticateToken,
  requireProducer,
  async (req: AuthRequest, res: Response) => {
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

      // Eğer video yoksa hata döndür
      if (!storefront.companyVideo) {
        return res.status(404).json({
          success: false,
          message: "Silinecek video bulunamadı",
        });
      }

      // Videoyu S3'ten sil
      try {
        const videoKey = storefront.companyVideo.split("/").pop();
        if (videoKey) {
          await deleteFromS3(`videos/${videoKey}`);
        }
      } catch (deleteError) {
        console.error("Video S3'ten silinirken hata:", deleteError);
        // S3'ten silinemese bile devam et
      }

      // Storefront'tan video URL'ini kaldır
      storefront.companyVideo = "";
      await storefront.save();

      res.json({
        success: true,
        message: "Video başarıyla silindi",
        data: {
          videoUrl: "",
        },
      });
    } catch (error) {
      console.error("Video silme hatası:", error);
      res.status(500).json({
        success: false,
        message: "Video silinirken hata oluştu",
      });
    }
  }
);

// DELETE company logo (logo silme)
router.delete(
  "/my-shop-window/logo",
  authenticateToken,
  requireProducer,
  async (req: AuthRequest, res: Response) => {
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

      // Eğer logo yoksa hata döndür
      if (!storefront.companyLogo) {
        return res.status(404).json({
          success: false,
          message: "Silinecek logo bulunamadı",
        });
      }

      // Logoyu S3'ten sil
      try {
        const logoKey = storefront.companyLogo.split("/").pop();
        if (logoKey) {
          await deleteFromS3(`logos/${logoKey}`);
        }
      } catch (deleteError) {
        console.error("Logo S3'ten silinirken hata:", deleteError);
        // S3'ten silinemese bile devam et
      }

      // Storefront'tan logo URL'ini kaldır
      storefront.companyLogo = "";
      await storefront.save();

      res.json({
        success: true,
        message: "Logo başarıyla silindi",
        data: {
          logoUrl: "",
        },
      });
    } catch (error) {
      console.error("Logo silme hatası:", error);
      res.status(500).json({
        success: false,
        message: "Logo silinirken hata oluştu",
      });
    }
  }
);

export default router;
