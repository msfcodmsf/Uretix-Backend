import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl as getSignedUrlV3 } from "@aws-sdk/s3-request-presigner";
import {
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import multer from "multer";
import multerS3 from "multer-s3";
import dotenv from "dotenv";

dotenv.config();

// AWS S3 Configuration
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

// S3 Bucket name
const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "uretix-bucket";

// Multer configuration for S3 upload
export const uploadToS3 = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: BUCKET_NAME,
    metadata: function (req, file, cb) {
      cb(null, { fieldName: file.fieldname });
    },
    key: function (req, file, cb) {
      // Generate unique filename
      const fileName = `${Date.now()}-${file.originalname}`;
      cb(null, fileName);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only images and documents
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype.startsWith("application/") ||
      file.mimetype.startsWith("text/")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Desteklenmeyen dosya türü"));
    }
  },
});

// Upload single file
export const uploadSingle = uploadToS3.single("file");

// Upload multiple files
export const uploadMultiple = uploadToS3.array("files", 5); // Max 5 files

// Delete file from S3
export const deleteFromS3 = async (key: string): Promise<void> => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
    console.log(`File deleted: ${key}`);
  } catch (error) {
    console.error("S3 delete error:", error);
    throw error;
  }
};

// Get signed URL for file access
export const getSignedUrl = async (
  key: string,
  expiresIn: number = 3600
): Promise<string> => {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrlV3(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error("S3 signed URL error:", error);
    throw error;
  }
};

// Upload file with custom key
export const uploadFile = async (
  file: Buffer,
  key: string,
  contentType: string
): Promise<string> => {
  try {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
      ACL: "public-read", // Make file publicly accessible
    });

    await s3Client.send(command);
    return `https://${BUCKET_NAME}.s3.${
      process.env.AWS_REGION || "us-east-1"
    }.amazonaws.com/${key}`;
  } catch (error) {
    console.error("S3 upload error:", error);
    throw error;
  }
};

// Get file info
export const getFileInfo = async (key: string) => {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const result = await s3Client.send(command);
    return {
      key: key,
      size: result.ContentLength,
      contentType: result.ContentType,
      lastModified: result.LastModified,
    };
  } catch (error) {
    console.error("S3 get file info error:", error);
    throw error;
  }
};

export default s3Client;
