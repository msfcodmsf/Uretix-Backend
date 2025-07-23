import express, { Request } from "express";
import multer from "multer";
import { ProducerService } from "../services/producerService";
import { authenticateToken } from "../middleware/auth";
import { validateProducerRole } from "../middleware/roles";
import { IUser } from "../models/User.model";

interface AuthRequest extends Request {
  user?: IUser;
}

const router = express.Router();

// Configure multer for video uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only video files are allowed"));
    }
  },
});

// Get all producers (for debugging)
router.get("/", async (req, res) => {
  try {
    const { Producer } = await import("../models/Producer.model");
    const producers = await Producer.find()
      .populate("user", "firstName lastName email")
      .lean();

    res.json({
      success: true,
      data: producers,
    });
  } catch (error) {
    console.error("Error getting producers:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get producers",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Create producer profile (for debugging)
router.post("/", async (req, res) => {
  try {
    const { Producer } = await import("../models/Producer.model");
    const { User } = await import("../models/User.model");
    const { Types } = await import("mongoose");

    const {
      userId,
      companyName,
      taxIdNumber,
      phoneNumber,
      gender,
      backupPhone,
    } = req.body;

    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if producer already exists
    const existingProducer = await Producer.findOne({ user: userId });
    if (existingProducer) {
      return res.status(400).json({
        success: false,
        message: "Producer profile already exists for this user",
      });
    }

    // Create producer
    const producer = new Producer({
      user: new Types.ObjectId(userId),
      companyName,
      taxIdNumber,
      phoneNumber,
      gender,
      backupPhone,
      isVerified: false,
    });

    await producer.save();

    res.json({
      success: true,
      message: "Producer profile created successfully",
      data: producer,
    });
  } catch (error) {
    console.error("Error creating producer:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create producer",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get producer my shop window
router.get(
  "/my-shop-window",
  authenticateToken,
  validateProducerRole,
  async (req: AuthRequest, res) => {
    try {
      const producerId = req.user?.id;
      if (!producerId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      const profile = await ProducerService.getProfile(producerId);

      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      console.error("Error getting producer my shop window:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get producer my shop window",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Get producer profile (kişisel bilgiler)
router.get(
  "/profile",
  authenticateToken,
  validateProducerRole,
  async (req: AuthRequest, res) => {
    try {
      const producerId = req.user?.id;
      if (!producerId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      const profile = await ProducerService.getProfile(producerId);

      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      console.error("Error getting producer profile:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get producer profile",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Update producer my shop window
router.put(
  "/my-shop-window",
  authenticateToken,
  validateProducerRole,
  async (req: AuthRequest, res) => {
    try {
      const producerId = req.user?.id;
      if (!producerId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }
      const profileData = req.body;

      const updatedProfile = await ProducerService.updateProfile(
        producerId,
        profileData
      );

      res.json({
        success: true,
        message: "My shop window updated successfully",
        data: updatedProfile,
      });
    } catch (error) {
      console.error("Error updating producer my shop window:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update producer my shop window",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Update producer profile (kişisel bilgiler)
router.put(
  "/profile",
  authenticateToken,
  validateProducerRole,
  async (req: AuthRequest, res) => {
    try {
      const producerId = req.user?.id;
      if (!producerId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }

      const profileData = req.body;

      const updatedProfile = await ProducerService.updatePersonalProfile(
        producerId,
        profileData
      );

      res.json({
        success: true,
        message: "Personal profile updated successfully",
        data: updatedProfile,
      });
    } catch (error) {
      console.error("Error updating producer personal profile:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update producer personal profile",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Upload video
router.post(
  "/my-shop-window/video",
  authenticateToken,
  validateProducerRole,
  upload.single("video"),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No video file provided",
        });
      }

      const producerId = req.user?.id;
      if (!producerId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }
      const videoUrl = await ProducerService.uploadVideo(producerId, req.file);

      res.json({
        success: true,
        message: "Video uploaded successfully",
        data: videoUrl,
      });
    } catch (error) {
      console.error("Error uploading video:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload video",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Get producer statistics
router.get(
  "/statistics",
  authenticateToken,
  validateProducerRole,
  async (req: AuthRequest, res) => {
    try {
      const producerId = req.user?.id;
      if (!producerId) {
        return res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
      }
      const statistics = await ProducerService.getStatistics(producerId);

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      console.error("Error getting producer statistics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get producer statistics",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export default router;
