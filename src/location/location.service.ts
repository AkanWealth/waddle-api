import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LocationService {
  constructor(private config: ConfigService) {}

  // verify the passes address variable
  // async verifyLocation(address: string) {
  //   try {
  //     const url = `https://google-map-places.p.rapidapi.com/maps/api/geocode/json?address=${address}&language=en`;
  //     const options = {
  //       method: 'GET',
  //       headers: {
  //         'x-rapidapi-key': this.config.getOrThrow('GEO_API_KEY'),
  //         'x-rapidapi-host': this.config.getOrThrow('GEO_HOST'),
  //       },
  //     };

  //     const response = await fetch(url, options);
  //     if (response.status === 404)
  //       throw new NotFoundException('Postal code not found');

  //     const result = await response.json();
  //     return { result: result?.results[0]?.formatted_address };
  //   } catch (error) {
  //     throw error;
  //   }
  // }
  async verifyLocation(address: string) {
    try {
      const url = `https://google-map-places.p.rapidapi.com/maps/api/geocode/json?address=${address}&language=en`;
      const options = {
        method: 'GET',
        headers: {
          'x-rapidapi-key': this.config.getOrThrow('GEO_API_KEY'),
          'x-rapidapi-host': this.config.getOrThrow('GEO_HOST'),
        },
      };

      const response = await fetch(url, options);
      if (response.status === 404) {
        throw new NotFoundException('Postal code not found');
      }

      const result = await response.json();
      console.log(result, 'Result');
      if (!result.results || result.results.length === 0) {
        throw new NotFoundException('No results found for this address');
      }

      return { result: result.results[0].formatted_address };
    } catch (error) {
      throw error;
    }
  }

  // calculate the distance between two address
  async calculateDistance(origin: string, destination: string) {
    try {
      const url = `https://driving-distance-calculator-between-two-points.p.rapidapi.com/data?origin=${origin}&destination=${destination}`;
      const options = {
        method: 'GET',
        headers: {
          'x-rapidapi-key': this.config.getOrThrow('DISTANCE_API_KEY'),
          'x-rapidapi-host': this.config.getOrThrow('DISTANCE_HOST'),
        },
      };

      const response = await fetch(url, options);
      const result = await response.text();
      return result;
    } catch (error) {
      throw error;
    }
  }
}
