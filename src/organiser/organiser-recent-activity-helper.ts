import { Injectable } from '@nestjs/common';
import { OrganiserService } from './organiser.service';
import { Prisma, RecentActivityType } from '@prisma/client';

@Injectable()
export class OrganiserRecentActivity {
  constructor(private organiserService: OrganiserService) {}

  async sendRecentOrderActivity(
    organiserId: string,
    amount: string | Prisma.Decimal,
    userName: string,
    count: number,
    eventName: string,
  ) {
    const spotText = count === 1 ? 'spot' : 'spots';

    await this.organiserService.createOrganiserRecentActivity({
      amount: amount as string,
      organiserId,
      type: RecentActivityType.ORDER,
      title: `${userName} booked ${count} ${spotText} for ${eventName}`,
    });
  }

  async sendRecentPaymentReceivedActivity(
    organiserId: string,
    amount: string | Prisma.Decimal,
    eventName: string,
  ) {
    await this.organiserService.createOrganiserRecentActivity({
      amount: amount as string,
      organiserId,
      type: RecentActivityType.PAYMENT,
      title: `Payment for ${eventName} booking completed`,
    });
  }

  async sendRecentBookingCancellationActivity(
    organiserId: string,
    amount: string,
    userName: string,
    count: number,
    eventName: string,
  ) {
    const spotText = count === 1 ? 'spot' : 'spots';

    await this.organiserService.createOrganiserRecentActivity({
      amount,
      organiserId,
      type: RecentActivityType.CANCELLED,
      title: `${userName} cancelled ${count} ${spotText} for ${eventName}`,
    });
  }
  async sendRecentEventCancellationActivity(
    organiserId: string,
    amount: string,
    count: number,
    eventName: string,
  ) {
    const spotText = count === 1 ? 'booking' : 'bookings';

    await this.organiserService.createOrganiserRecentActivity({
      amount,
      organiserId,
      type: RecentActivityType.BOOKING_CANCELLED,
      title: `You cancelled ${eventName}. 2 ${spotText} were refunded.`,
    });
  }
}
