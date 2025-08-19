import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/auth";
import uploadRoutes from "./routes/upload";
import adminRoutes from "./routes/admin";
import producerRoutes from "./routes/producer";
import productRoutes from "./routes/product";
import productionListingRoutes from "./routes/productionListing";
import advertisementRoutes from "./routes/advertisement";
import newsRoutes from "./routes/news";
import serviceRoutes from "./routes/service";
import categoryRoutes from "./routes/admin/categories";
import materialTypesRoutes from "./routes/admin/materialTypes";
import usageAreasRoutes from "./routes/admin/usageAreas";
import rawMaterialsRoutes from "./routes/admin/rawMaterials";
import productionMethodsRoutes from "./routes/admin/productionMethods";
import productionCategoryRoutes from "./routes/productionCategory";
import publicRawMaterialsRoutes from "./routes/rawMaterials";
import publicProductionMethodsRoutes from "./routes/productionMethods";
import surfaceTreatmentsRoutes from "./routes/surfaceTreatments";
import productInteractionsRoutes from "./routes/productInteractions";
import productionOffersRoutes from "./routes/productionOffers";
import commentRoutes from "./routes/comments";
import cartRoutes from "./routes/cart";
import orderRoutes from "./routes/order";
import announcementRoutes from "./routes/announcements";
import feedbackRoutes from "./routes/feedback";
import s3Client from "./config/s3";
import { ListBucketsCommand } from "@aws-sdk/client-s3";
import ProductAutoDeactivationService from "./services/productAutoDeactivationService";

// Environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration
const getCorsOrigins = () => {
  const origins = [
    process.env.FRONTEND_USER,
    process.env.FRONTEND_ADMIN,
  ].filter((url): url is string => Boolean(url));

  // Production ortamında sadece HTTPS origin'lere izin ver
  if (process.env.NODE_ENV === "production") {
    return origins.filter((origin) => origin.startsWith("https://"));
  }

  return origins;
};

const corsOptions = {
  origin: getCorsOrigins(),
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// MongoDB Connection
const MONGODB_URI = process.env.MONGO_DB_URL || "";

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("MongoDB bağlantısı başarılı");
  })
  .catch((error) => {
    console.error("MongoDB bağlantı hatası:", error);
  });

// Basic route
app.get("/", (req, res) => {
  res.json({ message: "UretiX Backend API çalışıyor!" });
});

// Health check route
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// AWS S3 bağlantı testi endpoint'i (Added for testing)
app.get("/s3-test", async (req, res) => {
  try {
    const command = new ListBucketsCommand({});
    const result = await s3Client.send(command);
    res.json({
      success: true,
      message: "AWS S3 bağlantısı başarılı!",
      buckets: result.Buckets?.map((b) => b.Name) || [],
      region: process.env.AWS_REGION,
      bucketName: process.env.AWS_S3_BUCKET_NAME,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "AWS S3 bağlantı hatası",
      error: String(error),
    });
  }
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/producer", producerRoutes);
app.use("/api/product", productRoutes);
app.use("/api/production-listings", productionListingRoutes);
app.use("/api/advertisements", advertisementRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/admin/categories", categoryRoutes);
app.use("/api/admin/material-types", materialTypesRoutes);
app.use("/api/admin/usage-areas", usageAreasRoutes);
app.use("/api/admin/raw-materials", rawMaterialsRoutes);
app.use("/api/admin/production-methods", productionMethodsRoutes);
app.use("/api/production-categories", productionCategoryRoutes);
app.use("/api/categories", productionCategoryRoutes);
app.use("/api/raw-materials", publicRawMaterialsRoutes);
app.use("/api/production-methods", publicProductionMethodsRoutes);
app.use("/api/surface-treatments", surfaceTreatmentsRoutes);
app.use("/api/product-interactions", productInteractionsRoutes);
app.use("/api/production-offers", productionOffersRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/feedback", feedbackRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);

  // Otomatik pasif hale getirme servisini başlat
  ProductAutoDeactivationService.startAutoDeactivationCron();
});
