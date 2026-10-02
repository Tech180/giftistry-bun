import type { ProductCandidate } from './product-candidate.interface';

export interface ResolvedProductCandidate {
  candidate: ProductCandidate;
  score: number;
}
