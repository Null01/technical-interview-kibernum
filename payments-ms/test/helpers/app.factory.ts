import { INestApplication, Module, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { MessagingModule } from '../../src/infrastructure/messaging/messaging.module';
import { EVENT_PUBLISHER } from '../../src/domain/shared/ports/event-publisher.port';

@Module({
  providers: [
    {
      provide: 'KAFKA_SERVICE',
      useValue: {
        connect: async () => undefined,
        emit:    () => ({ subscribe: () => undefined }),
        close:   async () => undefined,
      },
    },
    {
      provide: EVENT_PUBLISHER,
      useValue: { publish: async () => undefined },
    },
  ],
  exports: [EVENT_PUBLISHER],
})
class NoopMessagingModule {}

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
      transform:            true,
      whitelist:            true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.init();
  return app;
}
