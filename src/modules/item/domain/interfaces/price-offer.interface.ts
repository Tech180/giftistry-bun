import type { Availability } from '../types/availability.type';

export interface PriceOffer {
  price: number;
  currency?: string;
  availability?: Availability;
  seller?: string;
  sku?: string;
}
