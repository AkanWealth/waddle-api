import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CreateTicketDto, UpdateTicketDto } from './dto';

@Injectable()
export class TicketService {
  private readonly freshdeskDomain: string;
  private readonly freshdeskApiKey: string;
  private readonly freshdeskApiUrl: string;

  constructor(private config: ConfigService) {
    this.freshdeskDomain = process.env.FRESHDESK_DOMAIN;
    this.freshdeskApiKey = process.env.FRESHDESK_API_KEY;
    this.freshdeskApiUrl = `https://${this.freshdeskDomain}/api/v2`;
  }

  async create(dto: CreateTicketDto) {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(this.freshdeskApiKey).toString('base64')}`,
    };

    try {
      const response = await fetch(`${this.freshdeskApiUrl}/tickets`, {
        method: 'POST',
        body: JSON.stringify(dto),
        headers,
      });
      const data = await response.json();
      return { message: 'Ticket created', data };
    } catch (error) {
      throw error;
    }
  }

  async findAll(email: string) {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(this.freshdeskApiKey).toString('base64')}`,
    };

    try {
      const response = await fetch(
        `${this.freshdeskApiUrl}/tickets?email=${email}`,
        {
          headers,
        },
      );
      const data = await response.json();
      return { message: 'Tickets found', data };
    } catch (error) {
      throw error;
    }
  }

  async findOne(id: number) {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(this.freshdeskApiKey).toString('base64')}`,
    };

    try {
      const response = await fetch(`${this.freshdeskApiUrl}/tickets/${id}`, {
        headers,
      });
      if (response.status === 404)
        throw new NotFoundException(`The ticket id ${id} does not exist.`);

      const data = await response.json();
      return { message: 'Ticket found', data };
    } catch (error) {
      throw error;
    }
  }

  async findConversation(id: number) {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(this.freshdeskApiKey).toString('base64')}`,
    };

    try {
      const response = await fetch(
        `${this.freshdeskApiUrl}/tickets/${id}/conversations`,
        {
          headers,
        },
      );
      if (response.status === 404)
        throw new NotFoundException(`The ticket id ${id} does not exist.`);

      const data = await response.json();
      return { message: 'Ticket found', data };
    } catch (error) {
      throw error;
    }
  }

  // async update(id: number, dto: UpdateTicketDto) {
  //   const headers = {
  //     'Content-Type': 'application/json',
  //     Authorization: `Basic ${Buffer.from(this.freshdeskApiKey).toString('base64')}`,
  //   };

  //   try {
  //     const response = await fetch(`${this.freshdeskApiUrl}/tickets/${id}`, {
  //       method: 'PUT',
  //       body: JSON.stringify(dto),
  //       headers,
  //     });

  //     const data = await response.json();
  //     return data;
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  async remove(id: number) {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(this.freshdeskApiKey).toString('base64')}`,
    };

    try {
      const response = await fetch(`${this.freshdeskApiUrl}/tickets/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (response.status === 404)
        throw new NotFoundException(`The ticket id ${id} does not exist.`);

      return { message: `Ticket id ${id} deleted` };
    } catch (error) {
      throw error;
    }
  }
}
