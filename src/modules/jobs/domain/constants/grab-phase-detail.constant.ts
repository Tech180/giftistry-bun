import type { GrabPhase } from '../interfaces/grab-phase.type';

export const GRAB_PHASE_DETAIL: Record<GrabPhase, string> = {
  scraping: 'Scraping…',
  categorizing: 'Categorizing…',
  researching: 'Researching…',
  populating: 'Populating…',
};
