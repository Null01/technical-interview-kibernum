/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Inject, Module, OnModuleInit } from '@nestjs/common';
import { ClientKafka, ClientsModule, Transport } from '@nestjs/microservices';
import { Partitioners } from 'kafkajs';
import { EVENT_PUBLISHER } from '@domain/shared/ports/event-publisher.port';
import { CommonModule } from '../common/common.module';
import { KafkaEventPublisher } from './kafka-event-publisher';

@Module({
  imports: [
    CommonModule,
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: process.env.KAFKA_PRODUCER_CLIENT_ID ?? 'payments-producer',
            brokers:  [process.env.KAFKA_BROKER ?? 'localhost:9092'],
          },
          producer: {
            createPartitioner: Partitioners.DefaultPartitioner,
          },
        },
      },
    ]),
  ],
  providers: [
    KafkaEventPublisher,
    { provide: EVENT_PUBLISHER, useClass: KafkaEventPublisher },
  ],
  exports: [EVENT_PUBLISHER],
})
export class MessagingModule implements OnModuleInit {
  constructor(
    @Inject('KAFKA_SERVICE')
    private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.kafkaClient.connect();
  }
}
