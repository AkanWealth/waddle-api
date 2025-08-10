import {
  Controller,
  Post,
  Delete,
  Query,
  Body,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import { UploadService } from './upload.service';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBody,
  ApiConsumes,
  ApiResponse,
} from '@nestjs/swagger';
import { Request, Response } from 'express';

interface UploadResponse {
  success: boolean;
  message?: string;
  data?: string[];
}

interface DeleteResponse {
  success: boolean;
  message?: string;
  deleted?: string[];
}

@ApiTags('Uploads')
@Controller('uploads')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upload multiple images to a specified folder' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({
    name: 'folder',
    required: true,
    description: 'Target folder on S3 (e.g., events, users, vendors)',
    enum: ['events', 'users', 'vendors', 'crowdsource'], // Based on your env
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        images: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Array of image files (max 10, each max 50MB)', // Updated description
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Images uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of uploaded image URLs',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid files or folder',
  })
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB per file (increased from 10MB)
        files: 10,
      },
      fileFilter: (req, file, cb) => {
        console.log('File received:', {
          fieldname: file.fieldname,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        });

        const allowedMimeTypes = [
          'image/jpeg',
          'image/jpg',
          'image/png',
          'image/gif',
          'image/webp',
        ];

        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Invalid file type: ${file.mimetype}. Allowed: ${allowedMimeTypes.join(', ')}`,
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadImages(
    @Query('folder') folder: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    // Set CORS headers for this specific endpoint
    this.setCorsHeaders(req, res);

    // Log the request details
    console.log('Upload request received:', {
      method: req.method,
      url: req.url,
      origin: req.headers.origin,
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length'],
      folder,
      filesCount: files?.length || 0,
    });

    try {
      if (!folder) {
        throw new BadRequestException('Folder is required as query parameter');
      }

      if (!files || files.length === 0) {
        throw new BadRequestException('No files provided');
      }

      // Validate folder name
      const allowedFolders = ['events', 'users', 'vendors', 'crowdsource'];
      if (!allowedFolders.includes(folder)) {
        throw new BadRequestException(
          `Invalid folder. Allowed: ${allowedFolders.join(', ')}`,
        );
      }

      const urls = await this.uploadService.uploadMultiple(folder, files);

      // Return exact format your frontend expects
      const response: UploadResponse = {
        success: true,
        data: urls,
        message: `Successfully uploaded ${files.length} image(s)`,
      };

      res.status(200).json(response);
    } catch (error) {
      console.error('Upload error:', error);

      // Return exact error format your frontend expects
      const errorResponse: UploadResponse = {
        success: false,
        message: error.message || 'Upload failed',
      };

      res.status(400).json(errorResponse);
    }
  }

  @Delete('one')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a single image from a folder' })
  @ApiQuery({
    name: 'folder',
    required: true,
    description: 'Folder name',
    enum: ['events', 'users', 'vendors', 'crowdsource'],
  })
  @ApiQuery({
    name: 'fileName',
    required: true,
    description: 'Name of file to delete (with extension)',
  })
  @ApiResponse({
    status: 200,
    description: 'Image deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - missing parameters',
  })
  async deleteSingleImage(
    @Query('folder') folder: string,
    @Query('fileName') fileName: string,
  ): Promise<DeleteResponse> {
    if (!folder || !fileName) {
      throw new BadRequestException('Both folder and fileName are required');
    }

    try {
      await this.uploadService.deleteSingle(folder, fileName);
      return {
        success: true,
        message: 'Image deleted successfully',
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Delete failed');
    }
  }

  @Delete('many')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete multiple images from a folder' })
  @ApiQuery({
    name: 'folder',
    required: true,
    description: 'Folder name',
    enum: ['events', 'users', 'vendors', 'crowdsource'],
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fileNames: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of file names to delete',
          example: ['image1.jpg', 'image2.png'],
        },
      },
      required: ['fileNames'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Images deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        deleted: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array of successfully deleted file names',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - missing parameters',
  })
  async deleteMultipleImages(
    @Query('folder') folder: string,
    @Body('fileNames') fileNames: string[],
  ): Promise<DeleteResponse> {
    if (
      !folder ||
      !fileNames ||
      !Array.isArray(fileNames) ||
      fileNames.length === 0
    ) {
      throw new BadRequestException(
        'Folder and non-empty fileNames array are required',
      );
    }

    try {
      const deleted = await this.uploadService.deleteMultiple(
        folder,
        fileNames,
      );
      return {
        success: true,
        deleted,
        message: `Successfully deleted ${deleted.length} of ${fileNames.length} file(s)`,
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Delete failed');
    }
  }

  private setCorsHeaders(req: Request, res: Response): void {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://localhost:3030',
      'https://waddle-admin.vercel.app',
      'https://waddle-admn.vercel.app',
      'https://waddleapp.io',
      'https://www.waddleapp.io',
    ];

    const origin = req.headers.origin;

    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    } else {
      res.header('Access-Control-Allow-Origin', '*');
    }

    res.header(
      'Access-Control-Allow-Methods',
      'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    );
    res.header(
      'Access-Control-Allow-Headers',
      'Origin,X-Requested-With,Content-Type,Accept,Authorization',
    );
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
  }
}
