export const ASYNC_API_SPEC = {
  asyncapi: '2.6.0',
  info: {
    title: 'Orders MS — Kafka API',
    version: '1.0.0',
    description: 'Documentación de eventos Kafka del microservicio de órdenes.',
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
      description: 'Evento emitido cuando se crea una nueva orden. inventory-ms lo consume para validar y reservar stock.',
      publish: {
        operationId: 'publishOrderCreated',
        summary: 'Nueva orden creada — requiere validación de inventario',
        message: {
          name: 'OrderCreated',
          payload: {
            type: 'object',
            properties: {
              orderId:     { type: 'integer', description: 'ID de la orden',   example: 1001 },
              productId:   { type: 'integer', description: 'ID del producto',  example: 42   },
              quantity:    { type: 'number',  description: 'Cantidad solicitada', example: 5 },
              customerId:  { type: 'integer', description: 'ID del cliente',   example: 99   },
              totalAmount: { type: 'number',  description: 'Monto total',      example: 25000 },
            },
            required: ['orderId', 'productId', 'quantity', 'customerId', 'totalAmount'],
          },
        },
      },
    },
    'order.confirmed': {
      description: 'Evento emitido cuando el inventario reserva el stock. payments-ms lo consume para procesar el cobro.',
      publish: {
        operationId: 'publishOrderConfirmed',
        summary: 'Orden confirmada — lista para procesamiento de pago',
        message: {
          name: 'OrderConfirmed',
          payload: {
            type: 'object',
            properties: {
              orderId:     { type: 'integer', description: 'ID de la orden',   example: 1001  },
              totalAmount: { type: 'number',  description: 'Monto a cobrar',   example: 25000 },
              customerId:  { type: 'integer', description: 'ID del cliente',   example: 99    },
            },
            required: ['orderId', 'totalAmount', 'customerId'],
          },
        },
      },
    },
    'inventory.validated': {
      description: 'Evento consumido cuando inventory-ms confirma disponibilidad de stock.',
      subscribe: {
        operationId: 'handleInventoryValidated',
        summary: 'Confirmar la orden tras validación de inventario',
        message: {
          name: 'InventoryValidated',
          payload: {
            type: 'object',
            properties: {
              orderId: { type: 'integer', description: 'ID de la orden', example: 1001 },
            },
            required: ['orderId'],
          },
        },
      },
    },
    'inventory.insufficient': {
      description: 'Evento consumido cuando inventory-ms reporta stock insuficiente.',
      subscribe: {
        operationId: 'handleInventoryInsufficient',
        summary: 'Cancelar la orden por falta de stock',
        message: {
          name: 'InventoryInsufficient',
          payload: {
            type: 'object',
            properties: {
              orderId: { type: 'integer', description: 'ID de la orden',    example: 1001                },
              reason:  { type: 'string',  description: 'Motivo del rechazo', example: 'Stock insuficiente' },
            },
            required: ['orderId', 'reason'],
          },
        },
      },
    },
    'order.cancelled': {
      description: 'Evento emitido cuando la orden es cancelada (por stock insuficiente o pago fallido). inventory-ms lo consume para liberar la reserva de stock.',
      publish: {
        operationId: 'publishOrderCancelled',
        summary: 'Orden cancelada — liberar reserva de inventario',
        message: {
          name: 'OrderCancelled',
          payload: {
            type: 'object',
            properties: {
              orderId:   { type: 'integer', description: 'ID de la orden',  example: 1001 },
              productId: { type: 'integer', description: 'ID del producto', example: 42   },
              quantity:  { type: 'number',  description: 'Cantidad reservada a liberar', example: 5 },
            },
            required: ['orderId', 'productId', 'quantity'],
          },
        },
      },
    },
    'payment.processed': {
      description: 'Evento consumido cuando payments-ms confirma el cobro.',
      subscribe: {
        operationId: 'handlePaymentProcessed',
        summary: 'Marcar la orden como pagada',
        message: {
          name: 'PaymentProcessed',
          payload: {
            type: 'object',
            properties: {
              orderId: { type: 'integer', description: 'ID de la orden', example: 1001 },
            },
            required: ['orderId'],
          },
        },
      },
    },
    'payment.failed': {
      description: 'Evento consumido cuando payments-ms rechaza el pago. La orden es cancelada como parte de la compensación de la saga coreografiada.',
      subscribe: {
        operationId: 'handlePaymentFailed',
        summary: 'Cancelar la orden tras rechazo de pago',
        message: {
          name: 'PaymentFailed',
          payload: {
            type: 'object',
            properties: {
              orderId: { type: 'integer', description: 'ID de la orden', example: 1001 },
            },
            required: ['orderId'],
          },
        },
      },
    },
  },
};
