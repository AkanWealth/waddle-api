import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CrowdSourceStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { EventStatus } from 'src/utils/constants/eventTypes';
import { OrganiserStatus } from 'src/utils/constants/organiserTypes';

@Injectable()
export class GuestService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async guestActivities(page: number, pageSize: number) {
    try {
      const calSkip = (page - 1) * pageSize;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Fetch regular events
      const events = await this.prisma.event.findMany({
        where: {
          isPublished: true,
          status: EventStatus.APPROVED,
          date: {
            gte: today,
          },
          organiser: {
            isDeleted: false,
            status: { not: OrganiserStatus.SUSPENDED },
          },
        },
        include: {
          reviews: true,

          favorites: true,
          like: true,
          recommendations: true,
        },
      });

      // Fetch crowdsourced events
      const crowdSourcedEvents = await this.prisma.crowdSource.findMany({
        where: {
          isDeleted: false,
          status: CrowdSourceStatus.APPROVED,
          tag: 'Event',
        },
        include: {
          like: true,
          creator: true,
          attendances: {
            include: {
              user: {
                select: {
                  profile_picture: true,
                  id: true,
                },
              },
            },
          },
          reviews: {
            include: {
              user: {
                select: {
                  profile_picture: true,
                  id: true,
                },
              },
            },
          },
        },
      });

      // Fetch crowdsourced places
      const crowdSourcedPlaces = await this.prisma.crowdSource.findMany({
        where: {
          isDeleted: false,
          tag: 'Place',
          status: CrowdSourceStatus.APPROVED,
        },
        include: {
          like: true,
          creator: true,
          reviews: {
            include: {
              user: {
                select: {
                  profile_picture: true,
                  id: true,
                },
              },
            },
          },
        },
      });

      // Normalize the data structure
      const normalizedEvents = events.map((event) => ({
        id: event.id,
        name: event.name,
        description: event.description,
        address: event.address,
        price: event.price,
        date: event.date,
        time: event.time,
        category: event.category,
        facilities: event.facilities,
        tags: event.tags,
        images: event.files,
        type: 'event' as const,
        source: 'official' as const,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
        likes: event.like,
        reviews: event.reviews,
        favorites: event.favorites,
        recommendations: event.recommendations,
        totalTickets: event.total_ticket,
        ticketsBooked: event.ticket_booked,
        isUnlimited: event.isUnlimited,
        ageRange: event.age_range,
      }));

      const normalizedCrowdSourcedEvents = crowdSourcedEvents.map((event) => ({
        id: event.id,
        name: event.name,
        description: event.description,
        address: event.address,
        price: null,
        date: event.date,
        time: event.time,
        category: event.category,
        facilities: event.facilities,
        tags: [],
        images: event.images,
        type: 'event' as const,
        source: 'crowdsourced' as const,
        createdAt: event.createdAt,
        updatedAt: event.updatedAt,
        creator: event.creator,
        likes: event.like,
        attendances: event.attendances,
        reviews: event.reviews,
        isFree: event.isFree,
        tips: event.tips,
      }));

      const normalizedCrowdSourcedPlaces = crowdSourcedPlaces.map((place) => ({
        id: place.id,
        name: place.name,
        description: place.description,
        address: place.address,
        price: null,
        date: null,
        time: null,
        category: place.category,
        facilities: place.facilities,
        tags: [],
        images: place.images,
        type: 'place' as const,
        source: 'crowdsourced' as const,
        createdAt: place.createdAt,
        updatedAt: place.updatedAt,
        creator: place.creator,
        likes: place.like,
        reviews: place.reviews,
        isFree: place.isFree,
        tips: place.tips,
      }));

      // Combine all items
      const allItems = [
        ...normalizedEvents,
        ...normalizedCrowdSourcedEvents,
        ...normalizedCrowdSourcedPlaces,
      ];

      // Sort by createdAt (most recent first)
      allItems.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Calculate total count
      const totalItems = allItems.length;

      // Apply pagination
      const paginatedItems = allItems.slice(calSkip, calSkip + pageSize);

      if (paginatedItems.length === 0) {
        return {
          message: 'No items found for the given page.',
          items: [],
          totalItems: totalItems,
          currentPage: page,
          pageSize: pageSize,
          totalPages: Math.ceil(totalItems / pageSize),
          breakdown: {
            events: normalizedEvents.length,
            crowdSourcedEvents: normalizedCrowdSourcedEvents.length,
            places: normalizedCrowdSourcedPlaces.length,
          },
        };
      }

      return {
        message: 'Recent activities found',
        items: paginatedItems,
        totalItems: totalItems,
        currentPage: page,
        pageSize: pageSize,
        totalPages: Math.ceil(totalItems / pageSize),
        breakdown: {
          events: normalizedEvents.length,
          crowdSourcedEvents: normalizedCrowdSourcedEvents.length,
          places: normalizedCrowdSourcedPlaces.length,
        },
      };
    } catch (error) {
      throw error;
    }
  }
}

// Add this method to your event service or create a new unified service
