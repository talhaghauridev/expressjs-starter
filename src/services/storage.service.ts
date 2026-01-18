import cloudinary from '@/clients/cloudinary';
import { env } from '@/env';
import ApiError from '@/utils/api-error';
import slugify from 'slugify';
import { extractPublicId as _extractPublicId } from 'cloudinary-build-url';

export class StorageService {
  static async uploadImage(
    buffer: Buffer,
    folder: string = 'avatars'
  ): Promise<{ url: string; publicId: string }> {
    const rootFolder = slugify(env.APP_NAME, { lower: true });
    const folderName = `${rootFolder}/${folder}`;
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folderName,
          resource_type: 'auto',
          transformation: [{ width: 500, height: 500 }],
        },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(ApiError.badRequest('Upload failed'));
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      );
      uploadStream.end(buffer);
    });
  }

  static async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }

  static extractPublicId(url: string): string | null {
    return _extractPublicId(url);
  }
}
