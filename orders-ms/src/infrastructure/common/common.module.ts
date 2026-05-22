/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Module }          from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { TraceService }    from './trace/trace.service';
import { TraceInterceptor } from './trace/trace.interceptor';
import { AllExceptionsFilter }      from './filters/all-exceptions.filter';
import { BusinessExceptionFilter }  from './filters/business-exception.filter';
import { KafkaExceptionFilter }     from './filters/kafka-exception.filter';

@Module({
  providers: [
    TraceService,
    {
      provide:  APP_INTERCEPTOR,
      useClass: TraceInterceptor,
    },
    {
      provide:  APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide:  APP_FILTER,
      useClass: BusinessExceptionFilter,
    },
    {
      provide:  APP_FILTER,
      useClass: KafkaExceptionFilter,
    },
  ],
  exports: [TraceService],
})
export class CommonModule {}
