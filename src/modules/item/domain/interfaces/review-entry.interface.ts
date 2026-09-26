export interface ReviewEntry {
  author: string;
  rating: number;
  content: string;
  type: 'positive' | 'negative';
}
