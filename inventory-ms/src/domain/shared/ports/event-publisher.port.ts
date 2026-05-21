export const EVENT_PUBLISHER = 'EVENT_PUBLISHER';

export interface EventPublisherPort {
  publish(topic: string, payload: Record<string, unknown>): Promise<void>;
}
