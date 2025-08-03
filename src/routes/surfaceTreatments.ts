import express from "express";
import { SurfaceTreatment } from "../models";

const router = express.Router();

// GET all active surface treatments (public)
router.get("/", async (req, res) => {
  try {
    const surfaceTreatments = await SurfaceTreatment.find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .lean();

    res.json({
      success: true,
      data: surfaceTreatments,
    });
  } catch (error) {
    console.error("Yüzey işlemleri getirilirken hata:", error);
    res.status(500).json({
      success: false,
      message: "Yüzey işlemleri getirilemedi",
    });
  }
});

export default router;
