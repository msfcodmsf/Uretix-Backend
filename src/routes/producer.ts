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
