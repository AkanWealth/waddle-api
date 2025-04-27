import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport } from 'nodemailer';

@Injectable()
export class NotificationService {
  constructor(private config: ConfigService) {}

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
