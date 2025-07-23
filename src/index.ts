import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import authRoutes from "./routes/auth";
import uploadRoutes from "./routes/upload";
import adminRoutes from "./routes/admin";
import s3Client from "./config/s3";
import { ListBucketsCommand } from "@aws-sdk/client-s3";

// Environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const MONGODB_URI =
  process.env.MONGO_DB_URL || "mongodb://localhost:27017/uretix";

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

// Start server
app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
