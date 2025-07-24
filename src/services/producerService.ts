import { Producer, IProducer } from "../models/Producer.model";
import {
  ProducerStorefront,
  IProducerStorefront,
} from "../models/ProducerStorefront.model";
import { User, IUser } from "../models/User.model";
import { Types } from "mongoose";

export interface ProducerProfileData {
  // Company Information
  companyName: string;
  taxOffice: string;
  taxNumber: string;
  city: string;
  district: string;
  address: string;
  mainCategory: string;
  subCategories: string[];

  // User Information
  firstName: string;
  lastName: string;
  gender: string;
  email: string;
  phone: string;
  backupPhone: string;
  profileImage?: string;

  // About Us
  description: string;
  videoUrl?: string;

  // Service Details
  deliveryRegions: string[];
  estimatedDeliveryTime: string;
  shippingMethod: string;
  nonDeliveryRegions: string[];
  customProduction: boolean;
  averageProductionTime: string;
  sampleDelivery: boolean;
  offerArea: string;

  // Tags
  serviceTags: string[];
  interestTags: string[];
}

export class ProducerService {
  // Get producer profile
  static async getProfile(producerId: string) {
    try {
      // Get user data first
      const user = await User.findById(producerId).select("-password").lean();

      if (!user) {
        throw new Error("User not found");
      }

      // Producer'ı user'ın producer referansı ile bul
      const producer = await Producer.findOne({
        user: new Types.ObjectId(producerId),
      }).lean();

      // Eğer producer yoksa, sadece user bilgilerini kullan
      if (!producer) {
        return {
          producer: {
            id: user._id,
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            email: user.email || "",
            profileImage: user.profileImage || "",
            companyName: "",
            phoneNumber: "",
            gender: "",
            backupPhone: "",
          },
          storefront: {
            companyName: "",
            taxOffice: "",
            taxNumber: "",
            city: "",
            district: "",
            address: "",
            mainProductionCategory: "",
            subProductionCategories: [],
            companyDescription: "",
            companyVideo: "",
            deliveryRegions: [],
            estimatedDeliveryTime: "",
            shippingMethod: "",
            nonDeliveryRegions: [],
            customProduction: false,
            averageProductionTime: "",
            sampleDelivery: false,
            offerArea: "",
            serviceTags: [],
            interestTags: [],
          },
        };
      }

      const storefront = await ProducerStorefront.findOne({
        producer: producer._id,
      }).lean();

      // Eğer storefront yoksa, producer'dan gelen companyName'i kullan
      const storefrontData: any = storefront || {};

      // Şirket adını öncelik sırasına göre belirle:
      // 1. Storefront'ta varsa onu kullan
      // 2. Producer'da varsa onu kullan
      // 3. Hiçbiri yoksa boş string
      if (!storefrontData.companyName) {
        if (producer.companyName) {
          storefrontData.companyName = producer.companyName;
        } else {
          storefrontData.companyName = "";
        }
      }

      return {
        producer: {
          id: producer._id,
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          email: user.email || "",
          profileImage: user.profileImage || producer.profileImage || "",
          companyName: producer.companyName || "",
          taxIdNumber: producer.taxIdNumber || "",
          phoneNumber: producer.phoneNumber || "",
          gender: producer.gender || "",
          backupPhone: producer.backupPhone || "",
        },
        storefront: storefrontData,
      };
    } catch (error) {
      throw error;
    }
  }

  // Update producer profile (for storefront/vitrinim)
  static async updateProfile(
    producerId: string,
    data: Partial<ProducerProfileData>
  ) {
    try {
      // Find producer by user ID
      const producer = await Producer.findOne({
        user: new Types.ObjectId(producerId),
      });

      if (!producer) {
        throw new Error("Producer not found");
      }

      // Update user data
      const user = await User.findById(producerId);

      if (user) {
        if (data.firstName) user.firstName = data.firstName;
        if (data.lastName) user.lastName = data.lastName;
        if (data.email) user.email = data.email;
        if (data.profileImage) user.profileImage = data.profileImage;
        await user.save();
      }

      // Update producer data
      if (data.phone) producer.phoneNumber = data.phone;
      if (data.gender) producer.gender = data.gender;
      if (data.backupPhone) producer.backupPhone = data.backupPhone;
      if (data.profileImage) producer.profileImage = data.profileImage;
      if (data.taxNumber) producer.taxIdNumber = data.taxNumber;

      await producer.save();

      // Update or create storefront
      let storefront = await ProducerStorefront.findOne({
        producer: producerId,
      });

      if (!storefront) {
        storefront = new ProducerStorefront({
          producer: new Types.ObjectId(producerId),
          companyName: data.companyName || "",
          taxOffice: data.taxOffice || "",
          taxNumber: data.taxNumber || "",
          city: data.city || "",
          district: data.district || "",
          address: data.address || "",
          mainProductionCategory: data.mainCategory || "",
          subProductionCategories: data.subCategories || [],
          companyDescription: data.description || "",
          companyVideo: data.videoUrl || "",
          deliveryRegions: data.deliveryRegions || [],
          estimatedDeliveryTime: data.estimatedDeliveryTime || "",
          shippingMethod: data.shippingMethod || "",
          nonDeliveryRegions: data.nonDeliveryRegions || [],
          customProduction: data.customProduction || false,
          averageProductionTime: data.averageProductionTime || "",
          sampleDelivery: data.sampleDelivery || false,
          offerArea: data.offerArea || "",
          serviceTags: data.serviceTags || [],
          interestTags: data.interestTags || [],
        });
      } else {
        // Update existing storefront
        if (data.companyName !== undefined)
          storefront.companyName = data.companyName;
        if (data.taxOffice !== undefined) storefront.taxOffice = data.taxOffice;
        if (data.taxNumber !== undefined) storefront.taxNumber = data.taxNumber;
        if (data.city !== undefined) storefront.city = data.city;
        if (data.district !== undefined) storefront.district = data.district;
        if (data.address !== undefined) storefront.address = data.address;
        if (data.mainCategory !== undefined)
          storefront.mainProductionCategory = data.mainCategory;
        if (data.subCategories !== undefined)
          storefront.subProductionCategories = data.subCategories;
        if (data.description !== undefined)
          storefront.companyDescription = data.description;
        if (data.videoUrl !== undefined)
          storefront.companyVideo = data.videoUrl;
        if (data.deliveryRegions !== undefined)
          storefront.deliveryRegions = data.deliveryRegions;
        if (data.estimatedDeliveryTime !== undefined)
          storefront.estimatedDeliveryTime = data.estimatedDeliveryTime;
        if (data.shippingMethod !== undefined)
          storefront.shippingMethod = data.shippingMethod;
        if (data.nonDeliveryRegions !== undefined)
          storefront.nonDeliveryRegions = data.nonDeliveryRegions;
        if (data.customProduction !== undefined)
          storefront.customProduction = data.customProduction;
        if (data.averageProductionTime !== undefined)
          storefront.averageProductionTime = data.averageProductionTime;
        if (data.sampleDelivery !== undefined)
          storefront.sampleDelivery = data.sampleDelivery;
        if (data.offerArea !== undefined) storefront.offerArea = data.offerArea;
        if (data.serviceTags !== undefined)
          storefront.serviceTags = data.serviceTags;
        if (data.interestTags !== undefined)
          storefront.interestTags = data.interestTags;
      }

      await storefront.save();

      return {
        producer: producer.toObject(),
        storefront: storefront.toObject(),
      };
    } catch (error) {
      throw error;
    }
  }

  // Update producer personal profile (kişisel bilgiler)
  static async updatePersonalProfile(
    producerId: string,
    data: Partial<ProducerProfileData>
  ) {
    try {
      // Find producer by user ID
      const producer = await Producer.findOne({
        user: new Types.ObjectId(producerId),
      });

      if (!producer) {
        throw new Error("Producer not found");
      }

      // Update user data
      const user = await User.findById(producerId);

      if (user) {
        if (data.firstName) user.firstName = data.firstName;
        if (data.lastName) user.lastName = data.lastName;
        if (data.email) user.email = data.email;
        if (data.profileImage) user.profileImage = data.profileImage;
        await user.save();
      }

      // Update producer data
      if (data.phone) producer.phoneNumber = data.phone;
      if (data.gender) producer.gender = data.gender;
      if (data.backupPhone) producer.backupPhone = data.backupPhone;
      if (data.profileImage) producer.profileImage = data.profileImage;
      if (data.taxNumber) producer.taxIdNumber = data.taxNumber;

      await producer.save();

      return {
        producer: producer.toObject(),
      };
    } catch (error) {
      throw error;
    }
  }

  // Upload video to S3
  static async uploadVideo(producerId: string, videoFile: Express.Multer.File) {
    try {
      // TODO: Implement S3 upload logic
      // For now, return a mock URL
      const videoUrl = `https://s3.amazonaws.com/uretix-videos/${producerId}/${Date.now()}-${
        videoFile.originalname
      }`;

      // Update storefront with video URL
      await ProducerStorefront.findOneAndUpdate(
        { producer: producerId },
        { companyVideo: videoUrl },
        { upsert: true }
      );

      return { videoUrl };
    } catch (error) {
      throw error;
    }
  }

  // Get producer statistics
  static async getStatistics(producerId: string) {
    try {
      const stats = {
        totalProducts: 0,
        totalOrders: 0,
        totalRevenue: 0,
        activeListings: 0,
      };

      // TODO: Implement actual statistics calculation
      // For now, return mock data
      return stats;
    } catch (error) {
      throw error;
    }
  }
}
