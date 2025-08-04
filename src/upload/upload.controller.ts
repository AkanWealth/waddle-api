// // upload.controller.ts
// import {
//   Controller,
//   Post,
//   Delete,
//   Query,
//   Body,
//   UploadedFiles,
//   UseInterceptors,
// } from '@nestjs/common';
// import { UploadService } from './upload.service';
// import { FilesInterceptor } from '@nestjs/platform-express';
// import {
//   ApiTags,
//   ApiOperation,
//   ApiQuery,
//   ApiBody,
//   ApiConsumes,
// } from '@nestjs/swagger';

// @ApiTags('Uploads')
// @Controller('uploads')
// export class UploadController {
//   constructor(private readonly uploadService: UploadService) {}

//   @Post()
//   @ApiOperation({ summary: 'Upload multiple images to a specified folder' })
//   @ApiConsumes('multipart/form-data')
//   @ApiQuery({
//     name: 'folder',
//     required: true,
//     description: 'Target folder on S3',
//   })
//   @ApiBody({
//     schema: {
//       type: 'object',
//       properties: {
//         images: {
//           type: 'array',
//           items: {
//             type: 'string',
//             format: 'binary',
//           },
//         },
//       },
//     },
//   })
//   @UseInterceptors(FilesInterceptor('images', 10))
//   async uploadImages(
//     @Query('folder') folder: string,
//     @UploadedFiles() files: Express.Multer.File[],
//   ) {
//     if (!folder) {
//       return { success: false, message: 'Folder is required as query param' };
//     }

//     const urls = await this.uploadService.uploadMultiple(folder, files);
//     return { success: true, data: urls };
//   }

//   @Delete('one')
//   @ApiOperation({ summary: 'Delete a single image from a folder' })
//   @ApiQuery({ name: 'folder', required: true, description: 'Folder name' })
//   @ApiQuery({
//     name: 'fileName',
//     required: true,
//     description: 'Name of file to delete',
//   })
//   async deleteSingleImage(
//     @Query('folder') folder: string,
//     @Query('fileName') fileName: string,
//   ) {
//     if (!folder || !fileName) {
//       return { success: false, message: 'folder and fileName are required' };
//     }

//     await this.uploadService.deleteSingle(folder, fileName);
//     return { success: true, message: 'Image deleted successfully' };
//   }

//   @Delete('many')
//   @ApiOperation({ summary: 'Delete multiple images from a folder' })
//   @ApiQuery({ name: 'folder', required: true, description: 'Folder name' })
//   @ApiBody({
//     schema: {
//       type: 'object',
//       properties: {
//         fileNames: {
//           type: 'array',
//           items: { type: 'string' },
//         },
//       },
//     },
//   })
//   async deleteMultipleImages(
//     @Query('folder') folder: string,
//     @Body('fileNames') fileNames: string[],
//   ) {
//     if (!folder || !fileNames || !Array.isArray(fileNames)) {
//       return { success: false, message: 'folder and fileNames[] required' };
//     }

//     const deleted = await this.uploadService.deleteMultiple(folder, fileNames);
//     return { success: true, deleted };
//   }
// }

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
          description: 'Array of image files (max 10, each max 10MB)',
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
        fileSize: 10 * 1024 * 1024, // 10MB per file
      },
      fileFilter: (req, file, cb) => {
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
  ): Promise<UploadResponse> {
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

    try {
      const urls = await this.uploadService.uploadMultiple(folder, files);
      return {
        success: true,
        data: urls,
        message: `Successfully uploaded ${files.length} image(s)`,
      };
    } catch (error) {
      throw new BadRequestException(error.message || 'Upload failed');
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
}
