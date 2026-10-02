import type { Availability } from '../types/availability.type';
import type { FieldValue } from './field-value.interface';

export interface ReconciledFields {
  price: FieldValue<number> | null;
  imageUrl: FieldValue<string> | null;
  availability: FieldValue<Availability> | null;
}
