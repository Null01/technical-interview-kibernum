import { INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { MessagingModule } from '../../src/infrastructure/messaging/messaging.module';
import { EVENT_PUBLISHER } from '../../src/domain/shared/ports/event-publisher.port';

/**
 * Módulo de mensajería sin efecto que reemplaza MessagingModule en tests.
 * Provee un EVENT_PUBLISHER no-op para evitar conexiones reales a Kafka.
 */
@Module({
  providers: [
    {
      provide: 'KAFKA_SERVICE',
      useValue: {
        connect: async () => undefined,
        emit:    async () => undefined,
        close:   async () => undefined,
      },
    },
    {
      provide: EVENT_PUBLISHER,
      useValue: {
        publish: async () => undefined,
      },
    },
  ],
  exports: [EVENT_PUBLISHER],
})
class NoopMessagingModule {}

/**
 * Crea una instancia de la aplicación NestJS configurada para tests:
 *  - Sin conexión a Kafka (MessagingModule reemplazado por no-op)
 *  - Con PostgreSQL real (requiere Docker corriendo)
 *  - Outbox relay desactivado (intervalo de polling muy largo)
 *  - ValidationPipe global idéntica a main.ts
 */
export async function createTestingApp(): Promise<INestApplication> {
  process.env.OUTBOX_POLL_INTERVAL_MS = '999999999';

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideModule(MessagingModule)
    .useModule(NoopMessagingModule)
    .compile();

  const app = moduleRef.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      transform:             true,
      whitelist:             true,
      forbidNonWhitelisted:  true,
    }),
  );

  await app.init();
  return app;
}
