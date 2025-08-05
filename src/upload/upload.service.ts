import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly s3Client: S3Client,
  ) {}

  private async uploadImageToS3(
    folder: string,
    fileName: string,
    file: Buffer,
    mimeType: string,
  ) {
    this.logger.log('Uploading to S3:', {
      fileName,
      fileSize: file.length,
      bucket: this.config.getOrThrow('AWS_BUCKET_NAME'),
      folder,
      mimeType,
    });

    try {
      const command = new PutObjectCommand({
        Bucket: this.config.getOrThrow('AWS_BUCKET_NAME'),
        Key: `${folder}/${fileName}`,
        Body: file,
        ContentType: mimeType,
        // Remove ACL as Cloudflare R2 doesn't support it
        // ACL: 'public-read',
      });

      const result = await this.s3Client.send(command);
      this.logger.log(`Successfully uploaded ${fileName} to ${folder}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to upload ${fileName}:`, error);
      throw new BadRequestException(`Failed to upload file: ${fileName}`);
    }
  }

  private async deleteImageFromS3(folder: string, fileName: string) {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.getOrThrow('AWS_BUCKET_NAME'),
        Key: `${folder}/${fileName}`,
      });

      const result = await this.s3Client.send(command);
      this.logger.log(`Successfully deleted ${fileName} from ${folder}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to delete ${fileName}:`, error);
      throw new BadRequestException(`Failed to delete file: ${fileName}`);
    }
  }

  private constructPublicUrl(folder: string, fileName: string): string {
    // const publicUrl = this.config.get('R2_PUBLIC_ENDPOINT');
    // if (publicUrl) {
    //   // Use Cloudflare R2 public endpoint
    //   return `${publicUrl}/${folder}/${fileName}`;
    // }

    // Fallback to S3 URL construction
    const bucket = this.config.getOrThrow('AWS_BUCKET_NAME');
    const s3PublicUrl = this.config.get('S3_PUBLIC_URL');
    if (s3PublicUrl) {
      return `${s3PublicUrl}/${folder}/${fileName}`;
    }

    // Default S3 URL pattern
    const region = this.config.get('AWS_REGION', 'eu-north-1');
    return `https://${bucket}.s3.${region}.amazonaws.com/${folder}/${fileName}`;
  }

  private validateFile(file: Express.Multer.File): void {
    // Check file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File ${file.originalname} exceeds 10MB limit`,
      );
    }

    // Check file type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File ${file.originalname} has invalid type. Allowed: ${allowedMimeTypes.join(', ')}`,
      );
    }
  }

  async uploadMultiple(
    folder: string,
    files: Express.Multer.File[],
  ): Promise<string[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }

    if (files.length > 10) {
      throw new BadRequestException('Maximum 10 files allowed per upload');
    }

    const imageUrls: string[] = [];
    const uploadPromises: Promise<void>[] = [];

    for (const file of files) {
      // Validate each file
      this.validateFile(file);

      const uploadPromise = (async () => {
        const ext = file.originalname.split('.').pop()?.toLowerCase();
        if (!ext) {
          throw new BadRequestException(
            `File ${file.originalname} has no extension`,
          );
        }

        const fileName = `${uuidv4()}.${ext}`;
        await this.uploadImageToS3(
          folder,
          fileName,
          file.buffer,
          file.mimetype,
        );

        const url = this.constructPublicUrl(folder, fileName);
        imageUrls.push(url);
      })();

      uploadPromises.push(uploadPromise);
    }

    try {
      await Promise.all(uploadPromises);
      return imageUrls;
    } catch (error) {
      this.logger.error('Batch upload failed:', error);
      throw error;
    }
  }

  async deleteSingle(folder: string, fileName: string): Promise<any> {
    if (!folder || !fileName) {
      throw new BadRequestException('Folder and fileName are required');
    }

    return this.deleteImageFromS3(folder, fileName);
  }

  async deleteMultiple(folder: string, fileNames: string[]): Promise<string[]> {
    if (!folder || !fileNames || fileNames.length === 0) {
      throw new BadRequestException('Folder and fileNames are required');
    }

    const deleted: string[] = [];
    const deletePromises: Promise<void>[] = [];

    for (const fileName of fileNames) {
      const deletePromise = (async () => {
        try {
          await this.deleteSingle(folder, fileName);
          deleted.push(fileName);
        } catch (error) {
          this.logger.warn(`Failed to delete ${fileName}:`, error);
          // Continue with other deletions
        }
      })();

      deletePromises.push(deletePromise);
    }

    await Promise.all(deletePromises);
    return deleted;
  }
}
