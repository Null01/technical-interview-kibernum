/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response }  from 'express';
import { TraceService }       from '../trace/trace.service';
import { AppLoggerService }   from '../logging/app-logger.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new AppLoggerService(AllExceptionsFilter.name);

  constructor(private readonly traceService: TraceService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const transactionId = this.traceService.getTransactionId();
    const correlationId = this.traceService.getCorrelationId();
    const type          = host.getType<'http' | 'rpc'>();

    if (type === 'http') {
      const ctx = host.switchToHttp();
      const res = ctx.getResponse<Response>();
      const req = ctx.getRequest<Request>();

      const status =
        exception instanceof HttpException
          ? exception.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;

      const message =
        exception instanceof HttpException
          ? exception.message
          : 'Internal server error';

      this.logger.error(
        `${req.method} ${req.url} → ${status}: ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );

      res.status(status).json({
        statusCode:     status,
        error:          HttpStatus[status],
        message,
        transactionId,
        correlationId,
        timestamp:      new Date().toISOString(),
        path:           req.url,
      });

    } else {
      this.logger.error(
        `RPC error: ${exception instanceof Error ? exception.message : String(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
      throw exception;
    }
  }
}
