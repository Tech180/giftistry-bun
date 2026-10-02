import type { ScrapeTelemetryEvent } from '../interfaces/scrape-telemetry-event.interface';

export interface ScrapeTelemetry {
  record(event: ScrapeTelemetryEvent): void;
}
