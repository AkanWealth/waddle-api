import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';

@Module({
  imports: [ConfigModule],
  controllers: [UploadController],
  providers: [
    UploadService,
    {
      provide: S3Client,
      useFactory: (config: ConfigService) =>
        new S3Client({
          region: config.getOrThrow('AWS_REGION'),
          credentials: {
            accessKeyId: config.getOrThrow('AWS_ACCESS_KEY'),
            secretAccessKey: config.getOrThrow('AWS_SECRET_KEY'),
          },
        }),
      inject: [ConfigService],
    },
  ],
})
export class UploadModule {}
