import type { Priority } from '../../domain/interfaces/priority.interface';
import type { PriorityRow } from '../interfaces/priority-row.interface';

export function mapPriorityRow(row: PriorityRow): Priority {
  return {
    Id: row.Id,
    UserId: row.UserId,
    Label: row.Label,
    Weight: Number(row.Weight),
  };
}
