/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
export const ASYNC_API_SPEC = {
  asyncapi: '2.6.0',
  info: {
    title: 'Payments MS — Kafka API',
    version: '1.0.0',
    description: 'Documentación de eventos Kafka del microservicio de pagos.',
  },
  servers: {
    kafka: {
      url: process.env.KAFKA_BROKER ?? 'localhost:9092',
      protocol: 'kafka',
      description: 'Broker de Kafka',
    },
  },
  channels: {
    'order.confirmed': {
      description: 'Evento consumido cuando orders-ms confirma una orden con stock reservado. El servicio de pagos lo consume para intentar el cobro.',
      subscribe: {
        operationId: 'handleOrderConfirmed',
        summary: 'Procesar el cobro de una orden confirmada',
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
    'payment.processed': {
      description: 'Evento emitido cuando el pago fue aprobado por la pasarela. orders-ms lo consume para marcar la orden como pagada.',
      publish: {
        operationId: 'publishPaymentProcessed',
        summary: 'Pago aprobado — orden lista para despacho',
        message: {
          name: 'PaymentProcessed',
          payload: {
            type: 'object',
            properties: {
              paymentId:     { type: 'integer', description: 'ID del pago',               example: 501           },
              orderId:       { type: 'integer', description: 'ID de la orden',             example: 1001          },
              status:        { type: 'string',  description: 'Estado del pago',            example: 'approved'    },
              transactionId: { type: 'string',  description: 'ID de transacción externa',  example: 'txn_1234567' },
            },
            required: ['paymentId', 'orderId', 'status', 'transactionId'],
          },
        },
      },
    },
    'payment.failed': {
      description: 'Evento emitido cuando el pago fue rechazado por la pasarela. orders-ms lo consume para cancelar la orden y liberar el stock.',
      publish: {
        operationId: 'publishPaymentFailed',
        summary: 'Pago rechazado — orden cancelada',
        message: {
          name: 'PaymentFailed',
          payload: {
            type: 'object',
            properties: {
              paymentId: { type: 'integer', description: 'ID del pago',       example: 502                          },
              orderId:   { type: 'integer', description: 'ID de la orden',    example: 1002                         },
              status:    { type: 'string',  description: 'Estado del pago',   example: 'rejected'                   },
              reason:    { type: 'string',  description: 'Motivo del rechazo', example: 'Fondos insuficientes'       },
            },
            required: ['paymentId', 'orderId', 'status', 'reason'],
          },
        },
      },
    },
  },
};
