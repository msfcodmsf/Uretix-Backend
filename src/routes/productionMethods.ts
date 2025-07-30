import express, { Request, Response } from "express";
import { ProductionMethod } from "../models";

const router = express.Router();

// GET all production methods (public endpoint)
router.get("/", async (req: Request, res: Response) => {
  try {
    const productionMethods = await ProductionMethod.find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .select("-__v");

    res.json({
      success: true,
      data: productionMethods,
    });
  } catch (error) {
    console.error("Error fetching production methods:", error);
    res.status(500).json({
      success: false,
      message: "Üretim yöntemi kategorileri getirilemedi",
    });
  }
});

export default router;
