import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Adjust path as needed
import { EventFrequencyType } from '@prisma/client';
import { EventStatus } from 'src/utils/constants/eventTypes';

@Injectable()
export class EventFrequencyCronService {
  private readonly logger = new Logger(EventFrequencyCronService.name);

  constructor(private prisma: PrismaService) {}

  // Run every day at 6:00 AM
  async generateNextRecurringEvents() {
    this.logger.log('Starting next recurring events generation...');

    try {
      const currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0); // Start of today

      // Get all published events that have passed their date and need a next occurrence
      const pastRecurringEvents = await this.prisma.event.findMany({
        where: {
          isDeleted: false,
          isPublished: true,
          status: EventStatus.APPROVED,
          frequency: {
            not: EventFrequencyType.oneTime,
          },
          date: {
            lt: currentDate, // Events that have already passed
          },
        },
      });

      this.logger.log(
        `Found ${pastRecurringEvents.length} past recurring events to process`,
      );

      for (const event of pastRecurringEvents) {
        await this.createNextEventInstance(event);
      }

      this.logger.log(
        'Next recurring events generation completed successfully',
      );
    } catch (error) {
      this.logger.error('Error generating next recurring events:', error);
    }
  }

  private async createNextEventInstance(event: any) {
    try {
      const nextDate = this.calculateNextEventDate(event);

      if (!nextDate) {
        this.logger.log(
          `No next date calculated for event ${event.name} (${event.id})`,
        );
        return;
      }

      // Check if we already created the next instance
      const existingNextEvent = await this.prisma.event.findFirst({
        where: {
          name: event.name,
          organiserId: event.organiserId,
          adminId: event.adminId,
          date: nextDate,
          isDeleted: false,
          frequency: event.frequency,
        },
      });

      if (existingNextEvent) {
        this.logger.log(
          `Next event instance already exists for ${event.name} on ${nextDate.toISOString()}`,
        );
        return;
      }

      // Create the next event instance
      await this.createEventFromOriginal(event, nextDate);
      this.logger.log(
        `Created next recurring event: ${event.name} for ${nextDate.toISOString().split('T')[0]}`,
      );
    } catch (error) {
      this.logger.error(
        `Error creating next instance for event ${event.id}:`,
        error,
      );
    }
  }

  private calculateNextEventDate(event: any): Date | null {
    const eventDate = new Date(event.date);

    switch (event.frequency) {
      case EventFrequencyType.weekly:
        const nextWeekly = new Date(eventDate);
        nextWeekly.setDate(eventDate.getDate() + 7);
        return nextWeekly;

      case EventFrequencyType.everyTwoWeeks:
        const nextBiWeekly = new Date(eventDate);
        nextBiWeekly.setDate(eventDate.getDate() + 14);
        return nextBiWeekly;

      case EventFrequencyType.monthly:
        const nextMonthly = new Date(eventDate);
        nextMonthly.setMonth(eventDate.getMonth() + 1);
        return nextMonthly;

      case EventFrequencyType.custom:
        return this.getNextCustomDate(event, eventDate);

      default:
        return null;
    }
  }

  private getNextCustomDate(event: any, currentEventDate: Date): Date | null {
    if (!event.customFrequency || !Array.isArray(event.customFrequency)) {
      return null;
    }

    // Convert custom frequency dates to Date objects and sort them
    const customDates = event.customFrequency
      .map((dateString: string) => new Date(dateString))
      .sort((a, b) => a.getTime() - b.getTime());

    // Find the next date after the current event date
    const nextDate = customDates.find((date) => date > currentEventDate);

    return nextDate || null;
  }

  private async createEventFromOriginal(originalEvent: any, nextDate: Date) {
    // Create new event with same data but updated date
    const newEventData = {
      name: originalEvent.name,
      description: originalEvent.description,
      address: originalEvent.address,
      price: originalEvent.price,
      total_ticket: originalEvent.total_ticket,
      isUnlimited: originalEvent.isUnlimited,
      ticket_booked: 0, // Reset ticket count for new event
      frequency: originalEvent.frequency,
      customFrequency: originalEvent.customFrequency,
      date: nextDate,
      time: originalEvent.time, // Keep same time
      age_range: originalEvent.age_range,
      instructions: originalEvent.instructions || [],
      category: originalEvent.category,
      distance: originalEvent.distance,
      facilities: originalEvent.facilities || [],
      tags: originalEvent.tags || [],
      eventType: originalEvent.eventType,
      status: EventStatus.APPROVED, // New events start as pending
      rejectionReason: null,
      files: originalEvent.files || [],
      isPublished: originalEvent.isPublished,
      isDeleted: false,
      adminId: originalEvent.adminId,
      organiserId: originalEvent.organiserId,
    };

    await this.prisma.event.create({
      data: newEventData,
    });
  }

  // Optional: Manual trigger for testing
  async manualTriggerNextEvents() {
    this.logger.log('Manually triggering next recurring events generation...');
    await this.generateNextRecurringEvents();
  }

  // Helper method to get events that need next instance (for debugging)
  async getEventsPendingNextInstance() {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    return await this.prisma.event.findMany({
      where: {
        isDeleted: false,
        isPublished: true,
        frequency: {
          not: EventFrequencyType.oneTime,
        },
        date: {
          lt: currentDate,
        },
      },
      select: {
        id: true,
        name: true,
        date: true,
        frequency: true,
        customFrequency: true,
        organiserId: true,
        adminId: true,
      },
    });
  }

  // Method to preview what next dates would be generated
  async previewNextDates(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    const nextDate = this.calculateNextEventDate(event);

    return {
      currentDate: event.date,
      nextDate,
      frequency: event.frequency,
    };
  }
}
