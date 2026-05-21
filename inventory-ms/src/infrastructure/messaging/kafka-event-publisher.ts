/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { EventPublisherPort } from '@domain/shared/ports/event-publisher.port';
import { TraceService } from '../common/trace/trace.service';

@Injectable()
export class KafkaEventPublisher implements EventPublisherPort {
  private readonly logger = new Logger(KafkaEventPublisher.name);

  constructor(
    @Inject('KAFKA_SERVICE')
    private readonly kafkaClient: ClientKafka,
    private readonly traceService: TraceService,
  ) {}

  async publish(topic: string, payload: Record<string, unknown>): Promise<void> {
    const traceId = this.traceService.getTraceId();
    const start = Date.now();

    this.logger.log(
      `[${traceId}] → KAFKA emit topic=${topic} payload=${JSON.stringify(payload)}`,
    );

    await lastValueFrom(this.kafkaClient.emit(topic, payload));

    this.logger.log(
      `[${traceId}] ← KAFKA confirmed topic=${topic} ${Date.now() - start}ms`,
    );
  }
}
