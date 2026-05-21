/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Inject, Injectable } from '@nestjs/common';
import { ClientKafka }        from '@nestjs/microservices';
import { lastValueFrom }      from 'rxjs';
import { EventPublisherPort } from '@domain/shared/ports/event-publisher.port';
import { AppLoggerService }   from '../common/logging/app-logger.service';
import { getLogContext }      from '../common/logging/logger.storage';

@Injectable()
export class KafkaEventPublisher implements EventPublisherPort {
  private readonly logger = new AppLoggerService(KafkaEventPublisher.name);

  constructor (
    @Inject('KAFKA_SERVICE')
    private readonly kafkaClient: ClientKafka,
  ) {}

  async publish (topic: string, payload: Record<string, unknown>): Promise<void> {
    const { correlationId } = getLogContext();
    const start = Date.now();

    this.logger.log(`→ KAFKA emit topic=${topic} payload=${JSON.stringify(payload)} - correlationId=${correlationId}`);

    await lastValueFrom(
      this.kafkaClient.emit(topic, {
        headers: correlationId ? { 'x-correlation-id': correlationId } : {},
        value:   payload,
      }),
    );

    this.logger.log(`← KAFKA confirmed topic=${topic} ${Date.now() - start}ms`);
  }
}
