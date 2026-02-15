import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  /**
   * Upload an image buffer to Cloudinary.
   * Stores in 'smartduka/products' folder, auto-optimizes format & quality.
   * Returns the secure URL on success.
   */
  async uploadImage(
    file: Express.Multer.File,
    folder = 'smartduka/products',
  ): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { width: 800, height: 800, crop: 'limit', quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            this.logger.error(`Cloudinary upload failed: ${error.message}`);
            return reject(new Error(`Image upload failed: ${error.message}`));
          }
          if (!result) {
            return reject(new Error('Image upload returned no result'));
          }
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

      // Convert buffer to readable stream and pipe to Cloudinary
      const readableStream = new Readable();
      readableStream.push(file.buffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
  }

  /**
   * Delete an image from Cloudinary by its public ID.
   */
  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error: any) {
      this.logger.warn(`Failed to delete image ${publicId}: ${error.message}`);
    }
  }

  /**
   * Generate a Cloudinary URL with transformations for different sizes.
   * This allows serving optimized thumbnails from the same uploaded image.
   */
  getOptimizedUrl(url: string, width: number, height: number): string {
    if (!url || !url.includes('cloudinary.com')) return url;
    // Insert transformation before /upload/ path segment
    return url.replace(
      '/upload/',
      `/upload/c_fill,w_${width},h_${height},q_auto,f_auto/`,
    );
  }
}
