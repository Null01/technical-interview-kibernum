/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Module, OnModuleInit } from '@nestjs/common';
import { ClientKafka, ClientsModule, Transport } from '@nestjs/microservices';
import { Inject } from '@nestjs/common';
import { EVENT_PUBLISHER } from '@domain/shared/ports/event-publisher.port';
import { KafkaEventPublisher } from './kafka-event-publisher';
import { CommonModule } from '../common/common.module';
import { Partitioners } from 'kafkajs'

@Module({
  imports: [
    CommonModule,
    ClientsModule.register([
      {
        name: 'KAFKA_SERVICE',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: process.env.KAFKA_PRODUCER_CLIENT_ID ?? 'inventory-producer',
            brokers: [process.env.KAFKA_BROKER ?? 'localhost:9092'],
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
    {
      provide:  EVENT_PUBLISHER,
      useClass: KafkaEventPublisher,
    },
  ],
  exports: [EVENT_PUBLISHER],
})
export class MessagingModule implements OnModuleInit {
  constructor(
    @Inject('KAFKA_SERVICE')
    private readonly kafkaClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await this.kafkaClient.connect();
  }
}
