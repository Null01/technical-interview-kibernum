/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { OUTBOX_REPOSITORY } from '@domain/shared/ports/outbox.repository.port';
import type { OutboxRepositoryPort } from '@domain/shared/ports/outbox.repository.port';
import { EVENT_PUBLISHER } from '@domain/shared/ports/event-publisher.port';
import type { EventPublisherPort } from '@domain/shared/ports/event-publisher.port';
import { AppLoggerService } from '../common/logging/app-logger.service';
import { runWithLogContext, buildInitialContext } from '../common/logging/logger.storage';

const BATCH_SIZE = 50;

@Injectable()
export class OutboxRelayService implements OnModuleInit, OnModuleDestroy {
  private readonly logger    = new AppLoggerService(OutboxRelayService.name);
  private intervalRef: ReturnType<typeof setInterval> | null = null;

  constructor(
    @Inject(OUTBOX_REPOSITORY)
    private readonly outboxRepository: OutboxRepositoryPort,
    @Inject(EVENT_PUBLISHER)
    private readonly eventPublisher: EventPublisherPort,
  ) {}

  onModuleInit (): void {
    const intervalMs = Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? 5000);
    this.intervalRef = setInterval(() => void this.relay(), intervalMs);
    this.logger.log(`Outbox relay started — polling every ${intervalMs}ms`);
  }

  onModuleDestroy (): void {
    if (this.intervalRef) {
      clearInterval(this.intervalRef);
      this.logger.log('Outbox relay stopped');
    }
  }

  async relay (): Promise<void> {
    const events = await this.outboxRepository.findPending(BATCH_SIZE);
    if (!events.length) return;

    this.logger.debug(`Relaying ${events.length} pending outbox event(s)`);

    for (const event of events) {
      const storedCorrelationId = event.payload['correlationId'] as string | undefined;
      const logCtx = buildInitialContext(storedCorrelationId);

      await runWithLogContext(logCtx, async () => {
        try {
          await this.eventPublisher.publish(event.eventType, event.payload);
          await this.outboxRepository.markPublished(event.id);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.warn(`Outbox event ${event.id} (${event.eventType}) failed: ${msg}`);
          await this.outboxRepository.markFailed(event.id, msg);
        }
      });
    }
  }
}
