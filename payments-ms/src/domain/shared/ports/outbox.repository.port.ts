import { OutboxEventModel } from '../outbox/models/outbox-event.model';

export const OUTBOX_REPOSITORY = 'OUTBOX_REPOSITORY';

export interface SaveOutboxEventPayload {
  aggregateType: string;
  aggregateId:   number;
  eventType:     string;
  payload:       Record<string, unknown>;
}

export interface OutboxRepositoryPort {
  save(event: SaveOutboxEventPayload): Promise<void>;
  findPending(limit: number): Promise<OutboxEventModel[]>;
  markPublished(id: number): Promise<void>;
  markFailed(id: number, errorMessage: string): Promise<void>;
}
