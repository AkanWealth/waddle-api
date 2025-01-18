import { Controller, Get, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

@Controller('.well-known')
export class AppController {
  constructor(private config: ConfigService) {}

  @Get('assetlinks.json')
  async getAssetLinks(@Res() res: Response) {
    const assetLinks = [
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: this.config.getOrThrow('APP_PACKAGE_NAME'),
          sha256_cert_fingerprints: [
            this.config.getOrThrow('APP_FINGERPRINTS'),
          ],
        },
      },
    ];

    res.set('Content-Type', 'application/json');
    return res.json(assetLinks);
  }
}
