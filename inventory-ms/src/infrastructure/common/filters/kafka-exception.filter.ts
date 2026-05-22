/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-21
 */
import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseRpcExceptionFilter, KafkaContext } from '@nestjs/microservices';
import { Observable, EMPTY } from 'rxjs';
import { AppLoggerService } from '../logging/app-logger.service';

@Catch()
export class KafkaExceptionFilter extends BaseRpcExceptionFilter {
  private readonly logger = new AppLoggerService(KafkaExceptionFilter.name);

  override catch(exception: unknown, host: ArgumentsHost): Observable<never> {
    if (host.getType<'http' | 'rpc'>() !== 'rpc') {
      // Let the HTTP filters handle non-Kafka exceptions
      throw exception;
    }

    const kafkaCtx  = host.switchToRpc().getContext<KafkaContext>();
    const topic     = kafkaCtx?.getTopic?.()     ?? 'unknown-topic';
    const partition = kafkaCtx?.getPartition?.() ?? -1;
    const errorMsg  = exception instanceof Error ? exception.message : String(exception);
    const stack     = exception instanceof Error ? exception.stack   : undefined;

    this.logger.error(
      `[Kafka] Unhandled exception — topic="${topic}" partition=${partition} → ${errorMsg}`,
      stack,
    );

    // Returning EMPTY (not throwError) commits the Kafka offset so the
    // consumer can continue processing subsequent messages.
    return EMPTY as unknown as Observable<never>;
  }
}
