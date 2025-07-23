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
      const producer = await Producer.findById(producerId).lean();

      if (!producer) {
        throw new Error("Producer not found");
      }

      // Get user data
      const user = await User.findById(producer.user)
        .select("-password")
        .lean();

      const storefront = await ProducerStorefront.findOne({
        producer: producerId,
      }).lean();

      return {
        producer: {
          ...producer,
          ...user,
        },
        storefront: storefront || {},
      };
    } catch (error) {
      throw error;
    }
  }

  // Update producer profile
  static async updateProfile(
    producerId: string,
    data: Partial<ProducerProfileData>
  ) {
    try {
      const producer = await Producer.findById(producerId);
      if (!producer) {
        throw new Error("Producer not found");
      }

      // Update user data
      const user = await User.findById(producer.user);
      if (user) {
        if (data.firstName) user.firstName = data.firstName;
        if (data.lastName) user.lastName = data.lastName;
        if (data.email) user.email = data.email;
        await user.save();
      }

      // Update producer data
      if (data.phone) producer.phoneNumber = data.phone;
      if (data.gender) producer.gender = data.gender;
      if (data.backupPhone) producer.backupPhone = data.backupPhone;

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
