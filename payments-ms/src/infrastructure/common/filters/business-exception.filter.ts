/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Request, Response }                     from 'express';
import { BusinessException }                     from '@domain/shared/exceptions/business.exception';
import { TraceService }                          from '../trace/trace.service';
import { AppLoggerService }                      from '../logging/app-logger.service';

@Catch(BusinessException)
export class BusinessExceptionFilter implements ExceptionFilter<BusinessException> {
  private readonly logger = new AppLoggerService(BusinessExceptionFilter.name);

  constructor (private readonly traceService: TraceService) {}

  catch (exception: BusinessException, host: ArgumentsHost): void {
    const transactionId = this.traceService.getTransactionId();
    const correlationId = this.traceService.getCorrelationId();
    const type          = host.getType<'http' | 'rpc'>();

    this.logger.warn(
      `Business exception [${exception.errorCode}]: ${exception.message}`,
    );

    if (type === 'http') {
      const ctx = host.switchToHttp();
      const res = ctx.getResponse<Response>();
      const req = ctx.getRequest<Request>();

      res.status(exception.httpStatus).json({
        statusCode:     exception.httpStatus,
        error:          exception.errorCode,
        message:        exception.message,
        transactionId,
        correlationId,
        timestamp:      new Date().toISOString(),
        path:           req.url,
      });
    } else {
      throw exception;
    }
  }
}
