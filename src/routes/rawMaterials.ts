import express, { Request, Response } from "express";
import { RawMaterial } from "../models";

const router = express.Router();

// GET all raw materials (public endpoint)
router.get("/", async (req: Request, res: Response) => {
  try {
    const rawMaterials = await RawMaterial.find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .select("-__v");

    res.json({
      success: true,
      data: rawMaterials,
    });
  } catch (error) {
    console.error("Error fetching raw materials:", error);
    res.status(500).json({
      success: false,
      message: "Hammadde kategorileri getirilemedi",
    });
  }
});

export default router;
