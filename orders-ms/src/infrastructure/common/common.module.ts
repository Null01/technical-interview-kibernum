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

// KafkaExceptionFilter NO se registra aquí como APP_FILTER global porque
// @Catch() (catch-all) interceptaría también las excepciones HTTP y bloquearía
// BusinessExceptionFilter. En su lugar se aplica directamente sobre
// OrderEventsKafkaController con @UseFilters(), donde el filtro de controlador
// tiene precedencia sobre los filtros globales.

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
  ],
  exports: [TraceService],
})
export class CommonModule {}
