//  helper function to send mail using postmark
import { Client } from 'postmark';
import { config } from 'dotenv';
import { BadRequestException } from '@nestjs/common';
config();

export class Mailer {
  private client: Client;

  constructor() {
    this.client = new Client(process.env.POSTMARK_API_KEY || '');
  }

  async sendMail(recipient: string, subject: string, message: string) {
    try {
      const response = await this.client.sendEmail({
        From: `Waddle <${process.env.SMTP_USER}>`,
        To: recipient,
        Subject: subject,
        HtmlBody: message,
      });
      if (response.ErrorCode !== 0) {
        throw new BadRequestException(
          `Error sending email: ${response.Message}`,
        );
      }

      return {
        message: 'Email sent successfully',
        messageID: response.MessageID,
        recipient: response.To,
        submittedAt: response.SubmittedAt,
      };
    } catch (error) {
      throw error;
    }
  }
}
