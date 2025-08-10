import express, { Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import { Cart, ICartItem } from "../models/Cart.model";
import { Product } from "../models/Product.model";
import { User } from "../models/User.model";
import { Producer } from "../models/Producer.model";

interface AuthRequest extends Request {
  user?: any;
}

const router = express.Router();

// Sepeti getir
router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    let cart = await Cart.findOne({ user: userId }).populate({
      path: "items.product",
      populate: {
        path: "producer",
        select: "companyName city district",
      },
    });

    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
      await cart.save();
    }

    res.json({
      success: true,
      data: cart,
    });
  } catch (error) {
    console.error("Sepet getirme hatası:", error);
    res.status(500).json({
      success: false,
      message: "Sepet getirilirken hata oluştu",
    });
  }
});

// Sepete ürün ekle
router.post(
  "/add",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { productId, quantity, selectedVariant } = req.body;

      console.log("Sepete ekleme isteği:", {
        userId,
        productId,
        quantity,
        selectedVariant,
      });

      // Ürünü kontrol et
      const product = await Product.findById(productId).populate("producer");
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Ürün bulunamadı",
        });
      }

      console.log("Ürün bulundu:", {
        productId: product._id,
        name: product.name,
        variants: product.productVariants,
      });

      // Üreticinin kendi ürününü sepete ekleyip ekleyemeyeceğini kontrol et
      const producer = await Producer.findOne({ user: userId });
      if (
        producer &&
        product.producer._id.toString() === producer._id.toString()
      ) {
        return res.status(400).json({
          success: false,
          message: "Kendi ürününüzü sepete ekleyemezsiniz",
        });
      }

      // Varyant seçimi kontrolü
      if (!selectedVariant) {
        return res.status(400).json({
          success: false,
          message: "Varyant seçimi zorunludur",
        });
      }

      // Varyant fiyatını ve stoğunu hesapla
      let unitPrice = 0;
      let variantStock = 0;

      if (product.productVariants && product.productVariants.length > 0) {
        const variant = product.productVariants.find(
          (v) =>
            v.size === selectedVariant.size && v.color === selectedVariant.color
        );

        console.log("Varyant arama:", {
          selectedVariant,
          availableVariants: product.productVariants,
          foundVariant: variant,
        });

        if (!variant) {
          return res.status(400).json({
            success: false,
            message: "Seçilen varyant bulunamadı",
          });
        }

        unitPrice = variant.price;
        variantStock = variant.stock || 0;
      } else {
        // Varyant yoksa ilk varyantın fiyatını ve genel stoğu kullan
        unitPrice = product.productVariants[0]?.price || 0;
        variantStock = product.availableQuantity || 0;
      }

      console.log("Fiyat ve stok hesaplaması:", {
        unitPrice,
        variantStock,
        requestedQuantity: quantity,
      });

      // Varyant bazında stok kontrolü
      if (variantStock < quantity) {
        return res.status(400).json({
          success: false,
          message: "Seçilen varyant için yeterli stok bulunmuyor",
        });
      }

      // Sepeti bul veya oluştur
      let cart = await Cart.findOne({ user: userId });
      if (!cart) {
        cart = new Cart({ user: userId, items: [] });
      }

      // Sepette bu ürün var mı kontrol et
      const existingItemIndex = cart.items.findIndex(
        (item) =>
          item.product.toString() === productId &&
          JSON.stringify(item.selectedVariant) ===
            JSON.stringify(selectedVariant)
      );

      if (existingItemIndex > -1) {
        // Mevcut ürünün miktarını güncelle
        const newQuantity = cart.items[existingItemIndex].quantity + quantity;

        // Toplam miktar stoktan fazla olmamalı
        if (newQuantity > variantStock) {
          return res.status(400).json({
            success: false,
            message: "Seçilen varyant için yeterli stok bulunmuyor",
          });
        }

        cart.items[existingItemIndex].quantity = newQuantity;
        cart.items[existingItemIndex].totalPrice = newQuantity * unitPrice;
      } else {
        // Yeni ürün ekle
        const newItem: ICartItem = {
          product: productId,
          quantity,
          selectedVariant,
          unitPrice,
          totalPrice: quantity * unitPrice,
        };
        cart.items.push(newItem);
      }

      await cart.save();

      // Güncellenmiş sepeti getir
      const updatedCart = await Cart.findById(cart._id).populate({
        path: "items.product",
        populate: {
          path: "producer",
          select: "companyName city district",
        },
      });

      res.json({
        success: true,
        message: "Ürün sepete eklendi",
        data: updatedCart,
      });
    } catch (error) {
      console.error("Sepete ekleme hatası:", error);
      res.status(500).json({
        success: false,
        message: "Ürün sepete eklenirken hata oluştu",
      });
    }
  }
);

// Sepetten ürün çıkar
router.delete(
  "/remove/:itemId",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { itemId } = req.params;

      const cart = await Cart.findOne({ user: userId });
      if (!cart) {
        return res.status(404).json({
          success: false,
          message: "Sepet bulunamadı",
        });
      }

      cart.items = cart.items.filter(
        (item, index) => index.toString() !== itemId
      );
      await cart.save();

      const updatedCart = await Cart.findById(cart._id).populate({
        path: "items.product",
        populate: {
          path: "producer",
          select: "companyName city district",
        },
      });

      res.json({
        success: true,
        message: "Ürün sepetten çıkarıldı",
        data: updatedCart,
      });
    } catch (error) {
      console.error("Sepetten çıkarma hatası:", error);
      res.status(500).json({
        success: false,
        message: "Ürün sepetten çıkarılırken hata oluştu",
      });
    }
  }
);

// Sepet ürün miktarını güncelle
router.put(
  "/update/:itemId",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;
      const { itemId } = req.params;
      const { quantity } = req.body;

      if (quantity < 1) {
        return res.status(400).json({
          success: false,
          message: "Miktar en az 1 olmalıdır",
        });
      }

      const cart = await Cart.findOne({ user: userId });
      if (!cart) {
        return res.status(404).json({
          success: false,
          message: "Sepet bulunamadı",
        });
      }

      const itemIndex = parseInt(itemId);
      const item = cart.items[itemIndex];
      if (!item) {
        return res.status(404).json({
          success: false,
          message: "Ürün bulunamadı",
        });
      }

      // Stok kontrolü
      const product = await Product.findById(item.product);
      if (product && product.availableQuantity < quantity) {
        return res.status(400).json({
          success: false,
          message: "Yeterli stok bulunmuyor",
        });
      }

      item.quantity = quantity;
      item.totalPrice = quantity * item.unitPrice;

      await cart.save();

      const updatedCart = await Cart.findById(cart._id).populate({
        path: "items.product",
        populate: {
          path: "producer",
          select: "companyName city district",
        },
      });

      res.json({
        success: true,
        message: "Miktar güncellendi",
        data: updatedCart,
      });
    } catch (error) {
      console.error("Miktar güncelleme hatası:", error);
      res.status(500).json({
        success: false,
        message: "Miktar güncellenirken hata oluştu",
      });
    }
  }
);

// Sepeti temizle
router.delete(
  "/clear",
  authenticateToken,
  async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user?.id;

      const cart = await Cart.findOne({ user: userId });
      if (!cart) {
        return res.status(404).json({
          success: false,
          message: "Sepet bulunamadı",
        });
      }

      cart.items = [];
      await cart.save();

      res.json({
        success: true,
        message: "Sepet temizlendi",
        data: cart,
      });
    } catch (error) {
      console.error("Sepet temizleme hatası:", error);
      res.status(500).json({
        success: false,
        message: "Sepet temizlenirken hata oluştu",
      });
    }
  }
);

export default router;
