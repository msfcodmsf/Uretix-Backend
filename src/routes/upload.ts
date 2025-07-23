import { Router, Request, Response } from "express";
import {
  uploadSingle,
  uploadMultiple,
  deleteFromS3,
  getSignedUrl,
  getFileInfo,
} from "../config/s3";
import { auth } from "../middleware/auth";

const router = Router();

// Upload single file
router.post("/single", auth, (req: Request, res: Response) => {
  uploadSingle(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        message: "Dosya yükleme hatası",
        error: err.message,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "Dosya seçilmedi",
      });
    }

    try {
      const file = req.file as any;
      res.json({
        message: "Dosya başarıyla yüklendi",
        file: {
          key: file.key,
          location: file.location,
          originalName: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
        },
      });
    } catch (error) {
      res.status(500).json({
        message: "Sunucu hatası",
        error: String(error),
      });
    }
  });
});

// Upload multiple files
router.post("/multiple", auth, (req: Request, res: Response) => {
  uploadMultiple(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        message: "Dosya yükleme hatası",
        error: err.message,
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        message: "Dosya seçilmedi",
      });
    }

    try {
      const files = req.files as any[];
      const uploadedFiles = files.map((file) => ({
        key: file.key,
        location: file.location,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
      }));

      res.json({
        message: `${files.length} dosya başarıyla yüklendi`,
        files: uploadedFiles,
      });
    } catch (error) {
      res.status(500).json({
        message: "Sunucu hatası",
        error: String(error),
      });
    }
  });
});

// Delete file
router.delete("/:key", auth, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    await deleteFromS3(key);

    res.json({
      message: "Dosya başarıyla silindi",
      key: key,
    });
  } catch (error) {
    res.status(500).json({
      message: "Dosya silme hatası",
      error: String(error),
    });
  }
});

// Get signed URL for file access
router.get("/signed-url/:key", auth, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { expiresIn } = req.query;

    const url = await getSignedUrl(
      key,
      expiresIn ? parseInt(expiresIn as string) : 3600
    );

    res.json({
      signedUrl: url,
      key: key,
      expiresIn: expiresIn || 3600,
    });
  } catch (error) {
    res.status(500).json({
      message: "Signed URL oluşturma hatası",
      error: String(error),
    });
  }
});

// Get file info
router.get("/info/:key", auth, async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const fileInfo = await getFileInfo(key);

    res.json(fileInfo);
  } catch (error) {
    res.status(404).json({
      message: "Dosya bulunamadı",
      error: String(error),
    });
  }
});

export default router;
 