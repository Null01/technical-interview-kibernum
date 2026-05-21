export const ASYNC_API_SPEC = {
  asyncapi: '2.6.0',
  info: {
    title: 'Inventory MS — Kafka API',
    version: '1.0.0',
    description: 'Documentación de eventos Kafka del microservicio de inventario.',
  },
  servers: {
    kafka: {
      url: process.env.KAFKA_BROKER ?? 'localhost:9092',
      protocol: 'kafka',
      description: 'Broker de Kafka',
    },
  },
  channels: {
    'order.created': {
      description: 'Evento emitido cuando se crea una orden. El servicio de inventario lo consume para validar y reservar stock.',
      subscribe: {
        operationId: 'handleOrderCreated',
        summary: 'Validar y reservar stock para una nueva orden',
        message: {
          name: 'OrderCreated',
          payload: {
            type: 'object',
            properties: {
              orderId:   { type: 'integer', description: 'ID de la orden', example: 1001 },
              productId: { type: 'integer', description: 'ID del producto', example: 42 },
              quantity:  { type: 'number',  description: 'Cantidad solicitada', example: 5 },
            },
            required: ['orderId', 'productId', 'quantity'],
          },
        },
      },
    },
    'inventory.validated': {
      description: 'Evento emitido cuando el stock fue reservado exitosamente.',
      publish: {
        operationId: 'publishInventoryValidated',
        summary: 'Stock reservado para la orden',
        message: {
          name: 'InventoryValidated',
          payload: {
            type: 'object',
            properties: {
              orderId:   { type: 'integer', description: 'ID de la orden', example: 1001 },
              productId: { type: 'integer', description: 'ID del producto', example: 42 },
              quantity:  { type: 'number',  description: 'Cantidad reservada', example: 5 },
            },
            required: ['orderId', 'productId', 'quantity'],
          },
        },
      },
    },
    'inventory.insufficient': {
      description: 'Evento emitido cuando no hay stock suficiente para completar la orden.',
      publish: {
        operationId: 'publishInventoryInsufficient',
        summary: 'Stock insuficiente para la orden',
        message: {
          name: 'InventoryInsufficient',
          payload: {
            type: 'object',
            properties: {
              orderId:   { type: 'integer', description: 'ID de la orden', example: 1001 },
              productId: { type: 'integer', description: 'ID del producto', example: 42 },
              reason:    { type: 'string',  description: 'Motivo del rechazo', example: 'Stock insuficiente' },
            },
            required: ['orderId', 'productId', 'reason'],
          },
        },
      },
    },
  },
};
