/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable }           from 'rxjs';
import { tap }                  from 'rxjs/operators';
import { Request, Response }    from 'express';
import { KafkaContext }         from '@nestjs/microservices';
import { TraceService }         from './trace.service';
import { AppLoggerService }     from '../logging/app-logger.service';
import { LogContext }           from '../logging/log-context.interface';
import { buildInitialContext }  from '../logging/logger.storage';

/**
 * Global interceptor that:
 *  1. Generates a fresh transactionId for every incoming HTTP request or Kafka message.
 *  2. Reads X-Correlation-ID from HTTP headers / Kafka message headers to continue a
 *     cross-service trace; if absent, uses the transactionId as correlationId.
 *  3. Echoes X-Correlation-ID back in the HTTP response header.
 *  4. Stores the full LogContext in AsyncLocalStorage so every logger in the
 *     downstream call chain automatically includes the trace IDs without explicit passing.
 *  5. Logs the request entry and response/ack with timing via AppLoggerService.
 */
@Injectable()
export class TraceInterceptor implements NestInterceptor {
  private readonly logger = new AppLoggerService(TraceInterceptor.name);

  constructor (private readonly traceService: TraceService) {}

  intercept (context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const type  = context.getType<'http' | 'rpc'>();
    const start = Date.now();

    let logCtx: LogContext;

    if (type === 'http') {
      const req           = context.switchToHttp().getRequest<Request>();
      const correlationId = req.headers['x-correlation-id'] as string | undefined;

      logCtx = {
        ...buildInitialContext(correlationId),
        httpMethod: req.method,
        httpPath:   req.path,
      };

      context.switchToHttp()
        .getResponse<Response>()
        .setHeader('x-correlation-id', logCtx.correlationId);

    } else {
      const kafkaCtx   = context.switchToRpc().getContext<KafkaContext>();
      const msgHeaders = kafkaCtx.getMessage().headers ?? {};
      const correlationId =
        (msgHeaders['x-correlation-id'] as Buffer | string | undefined)
          ?.toString() ?? undefined;

      logCtx = {
        ...buildInitialContext(correlationId),
        kafkaTopic:     kafkaCtx.getTopic(),
        kafkaPartition: kafkaCtx.getPartition(),
        kafkaOffset:    kafkaCtx.getMessage().offset,
      };
    }

    return new Observable(subscriber => {
      this.traceService.run(logCtx, () => {

        if (type === 'http') {
          const req     = context.switchToHttp().getRequest<Request>();
          const bodyLog = req.body && Object.keys(req.body).length
            ? ` body=${JSON.stringify(req.body)}`
            : '';
          this.logger.log(`→ ${req.method} ${req.path}${bodyLog}`);
        } else {
          const payload = context.switchToRpc().getData<unknown>();
          this.logger.log(
            `← KAFKA recv topic=${logCtx.kafkaTopic}` +
            ` partition=${logCtx.kafkaPartition}` +
            ` offset=${logCtx.kafkaOffset}` +
            ` payload=${JSON.stringify(payload)}`,
          );
        }

        next.handle().pipe(
          tap({
            next: (value) => {
              const elapsed = Date.now() - start;
              const resLog  = value != null ? ` res=${JSON.stringify(value)}` : '';

              if (type === 'http') {
                const status = context.switchToHttp().getResponse<Response>().statusCode;
                this.logger.log(`← ${status} ${elapsed}ms${resLog}`);
              } else {
                this.logger.log(`→ KAFKA ack ${elapsed}ms${resLog}`);
              }
            },
            error: () => {
              this.logger.warn(`failed after ${Date.now() - start}ms`);
            },
          }),
        ).subscribe({
          next:     v => subscriber.next(v),
          error:    e => subscriber.error(e),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
