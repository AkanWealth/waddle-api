import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';
import * as firebase from 'firebase-admin';
import { sendNotificationDTO } from './dto';

@Injectable()
export class NotificationService {
  constructor(private config: ConfigService) {}

  async sendPush(dto: sendNotificationDTO) {
    try {
      await firebase
        .messaging()
        .send({
          notification: {
            title: dto.title,
            body: dto.body,
          },
          token: dto.deviceId,
          data: {},
          android: {
            priority: 'high',
            notification: {
              sound: 'default',
              channelId: 'default',
            },
          },
          apns: {
            headers: {
              'apns-priority': '10',
            },
            payload: {
              aps: {
                contentAvailable: true,
                sound: 'default',
              },
            },
          },
        })
        .catch((error: any) => {
          console.error(error);
        });
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  async sendMail(recipient: string, subject: string, message: string) {
    try {
      const transporter = createTransport({
        host: this.config.getOrThrow('SMTP_HOST'),
        port: this.config.getOrThrow('SMTP_PORT'),
        auth: {
          user: this.config.getOrThrow('SMTP_USER'),
          pass: this.config.getOrThrow('SMTP_PASSWORD'),
        },
      });

      const mailOptions = {
        from: `"Waddle" <${this.config.getOrThrow('SMTP_USER')}>`,
        to: recipient,
        subject: subject,
        html: message,
      };
      await transporter.sendMail(mailOptions);

      return { message: 'Email sent successfully' };
    } catch (error) {
      throw error;
    }
  }
}
