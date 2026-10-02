import type { ScrapeTelemetry } from '../../domain/ports/scrape-telemetry.port';
import type { ScrapeTelemetryEvent } from '../../domain/interfaces/scrape-telemetry-event.interface';

/**
 * Structured scrape telemetry (JSON lines). Suitable for log aggregation.
 * Optional future: persist to `scrape_events` table — not wired yet.
 */
export class LogScrapeTelemetry implements ScrapeTelemetry {
  record(event: ScrapeTelemetryEvent): void {
    console.log(JSON.stringify({ event: 'scrape_telemetry', ...event }));
  }
}

export const noopScrapeTelemetry: ScrapeTelemetry = {
  record() {
    /* tests / disabled */
  },
};
