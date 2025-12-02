import cloudinary from "../config/cloudinary.config";
import { ApiError } from "../middleware/error.middleware";
import { Readable } from "stream";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface UploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  bytes: number;
}

export class UploadService {
  /**
   * Check if Cloudinary is configured
   */
  private static isCloudinaryConfigured(): boolean {
    return !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );
  }

  /**
   * Upload image locally (fallback when Cloudinary is not configured)
   */
  private static async uploadImageLocally(
    buffer: Buffer,
    options: {
      folder?: string;
      public_id?: string;
    } = {}
  ): Promise<UploadResult> {
    try {
      // Create uploads directory if it doesn't exist
      const uploadsDir = path.join(
        process.cwd(),
        "uploads",
        options.folder || "avatars"
      );
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // Generate filename
      const filename = options.public_id || crypto.randomUUID();
      const extension = "jpg"; // Default to jpg for simplicity
      const fullFilename = `${filename}.${extension}`;
      const filePath = path.join(uploadsDir, fullFilename);

      // Write file
      fs.writeFileSync(filePath, buffer);

      // Return result in Cloudinary-compatible format
      return {
        public_id: `${options.folder || "avatars"}/${filename}`,
        secure_url: `/uploads/${options.folder || "avatars"}/${fullFilename}`,
        width: 400, // Default values
        height: 400,
        format: extension,
        resource_type: "image",
        bytes: buffer.length,
      };
    } catch (error) {
      console.error("Local upload error:", error);
      throw new ApiError("Failed to upload image locally", 500);
    }
  }

  /**
   * Upload image to Cloudinary or locally
   */
  static async uploadImage(
    buffer: Buffer,
    options: {
      folder?: string;
      public_id?: string;
      transformation?: any;
      resource_type?: "auto" | "image" | "video" | "raw";
    } = {}
  ): Promise<UploadResult> {
    // Check if Cloudinary is configured
    if (!this.isCloudinaryConfigured()) {
      console.log("Cloudinary not configured, using local storage fallback");
      return this.uploadImageLocally(buffer, options);
    }

    try {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: options.folder || "mas3ndi",
            public_id: options.public_id,
            transformation: options.transformation,
            resource_type: options.resource_type || "image",
            quality: "auto",
            fetch_format: "auto",
          },
          (error, result) => {
            if (error) {
              reject(new ApiError(`Upload failed: ${error.message}`, 500));
            } else if (result) {
              resolve(result as UploadResult);
            } else {
              reject(new ApiError("Upload failed: No result returned", 500));
            }
          }
        );

        // Convert buffer to stream and pipe to Cloudinary
        const bufferStream = new Readable();
        bufferStream.push(buffer);
        bufferStream.push(null);
        bufferStream.pipe(uploadStream);
      });
    } catch (error) {
      throw new ApiError(
        `Upload service error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        500
      );
    }
  }

  /**
   * Upload avatar with specific transformations
   */
  static async uploadAvatar(
    buffer: Buffer,
    userId: string
  ): Promise<UploadResult> {
    try {
      const result = await this.uploadImage(buffer, {
        folder: "mas3ndi/avatars",
        public_id: `avatar_${userId}`,
        transformation: [
          {
            width: 400,
            height: 400,
            crop: "fill",
            gravity: "face",
            quality: "auto",
            format: "jpg",
          },
        ],
      });

      return result;
    } catch (error) {
      throw new ApiError(
        `Avatar upload failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        500
      );
    }
  }

  /**
   * Delete image from Cloudinary
   */
  static async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      // Log error but don't throw - deletion failure shouldn't break the flow
      console.error("Failed to delete image from Cloudinary:", error);
    }
  }

  /**
   * Extract public_id from Cloudinary URL
   */
  static extractPublicId(url: string): string | null {
    try {
      const matches = url.match(/\/v\d+\/(.+)\./);
      return matches ? matches[1] : null;
    } catch (error) {
      return null;
    }
  }
}
