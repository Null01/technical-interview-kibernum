import 'dotenv/config';
import { NestFactory }         from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe }      from '@nestjs/common';
import { AppModule }           from './app.module';
import { AppLoggerService }    from './infrastructure/common/logging/app-logger.service';

async function bootstrap() {
  const logger = new AppLoggerService('Bootstrap');

  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(logger);

  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }),
  );

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: process.env.KAFKA_CLIENT_ID ?? 'orders',
        brokers:  [process.env.KAFKA_BROKER   ?? 'localhost:9092'],
      },
      consumer: { groupId: process.env.KAFKA_CONSUMER_GROUP_ID ?? 'orders-consumer-group' },
    },
  });

  const restConfig = new DocumentBuilder()
    .setTitle('Orders MS — REST API')
    .setDescription('')
    .setVersion('1.0')
    .addTag('health', 'Estado del servicio')
    .addTag('orders', 'Gestión de órdenes')
    .build();

  const restDocument = SwaggerModule.createDocument(app, restConfig);
  SwaggerModule.setup('api', app, restDocument, {
    customSiteTitle:  'Orders MS — REST API',
    swaggerOptions:   { persistAuthorization: true },
  });

  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3002);

  const port = process.env.PORT ?? 3002;
  logger.log(`orders-ms running on port ${port}`);
  logger.log(`REST  Swagger UI → http://localhost:${port}/api`);
  logger.log(`Kafka AsyncAPI   → http://localhost:${port}/async-api`);
}

bootstrap();
