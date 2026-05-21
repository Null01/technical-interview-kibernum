/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory }         from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe }      from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule }           from './app.module';
import { AppLoggerService }    from './infrastructure/common/logging/app-logger.service';

async function bootstrap () {
  const logger = new AppLoggerService('Bootstrap');

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(logger);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: process.env.KAFKA_CLIENT_ID ?? 'payments',
        brokers:  [process.env.KAFKA_BROKER   ?? 'localhost:9092'],
      },
      consumer: {
        groupId: process.env.KAFKA_CONSUMER_GROUP_ID ?? 'payments-consumer-group',
      },
    },
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform:            true,
      whitelist:            true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Payments MS — REST API')
    .setDescription('API del microservicio de pagos')
    .setVersion('1.0')
    .addTag('health', 'Estado del servicio')
    .addTag('payments', 'Gestión de pagos')
    .build();
  SwaggerModule.setup('api', app, SwaggerModule.createDocument(app, config));

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3003);

  const port = process.env.PORT ?? 3003;
  logger.log(`payments-ms running on port ${port}`);
  logger.log(`REST  Swagger UI → http://localhost:${port}/api`);
  logger.log(`Kafka AsyncAPI   → http://localhost:${port}/async-api`);
}

bootstrap();
