import { OutboxEventStatus } from '../enums/outbox-event-status.enum';

export interface OutboxEventModel {
  id: number;
  aggregateType: string;
  aggregateId: number;
  eventType: string;
  payload: Record<string, unknown>;
  status: OutboxEventStatus;
  retries: number;
  errorMessage: string | null;
  createdAt: Date;
  publishedAt: Date | null;
}
