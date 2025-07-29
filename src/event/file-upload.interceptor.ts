import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { FileInterceptor } from '@nestjs/platform-express';

@Injectable()
export class LargeFileUploadInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const file = request.file;

    if (file) {
      // Log file information for debugging
      console.log('File upload info:', {
        originalname: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        fieldname: file.fieldname,
      });

      // Check if file size is reasonable (50MB max)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        throw new BadRequestException(
          `File size too large. Maximum allowed size is 50MB. Received: ${Math.round(
            file.size / (1024 * 1024),
          )}MB`,
        );
      }

      // Validate file type
      if (!file.mimetype.startsWith('image/')) {
        throw new BadRequestException(
          'Invalid file type. Only image files are allowed.',
        );
      }
    }

    return next.handle();
  }
}

// Custom file interceptor with larger limits
export const LargeFileInterceptor = FileInterceptor('images', {
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      return callback(
        new BadRequestException('Only image files are allowed'),
        false,
      );
    }
    callback(null, true);
  },
});
