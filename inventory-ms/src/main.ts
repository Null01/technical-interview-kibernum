import 'dotenv/config'
import { NestFactory } from '@nestjs/core'
import { MicroserviceOptions, Transport } from '@nestjs/microservices'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap () {
  const app = await NestFactory.create(AppModule)

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: process.env.KAFKA_CLIENT_ID ?? 'inventory',
        brokers: [process.env.KAFKA_BROKER ?? 'localhost:9092'],
      },
      consumer: { groupId: process.env.KAFKA_CONSUMER_GROUP_ID ?? 'inventory-consumer-group' },
    },
  })

  const restConfig = new DocumentBuilder()
    .setTitle('Inventory MS — REST API')
    .setDescription('')
    .setVersion('1.0')
    .addTag('health', 'Estado del servicio')
    .addTag('products', 'Catálogo de productos')
    .build()

  const restDocument = SwaggerModule.createDocument(app, restConfig)
  SwaggerModule.setup('api', app, restDocument, {
    customSiteTitle: 'Inventory MS — REST API',
    swaggerOptions: { persistAuthorization: true },
  })

  await app.startAllMicroservices()
  await app.listen(process.env.PORT ?? 3001)

  const port = process.env.PORT ?? 3001
  console.log(`inventory-ms corriendo en puerto ${port}`)
  console.log(`REST  Swagger UI → http://localhost:${port}/api`)
  console.log(`Kafka AsyncAPI   → http://localhost:${port}/async-api`)
}

bootstrap()
