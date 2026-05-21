/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Injectable, LoggerService } from '@nestjs/common';
import { getLogContext }             from './logger.storage';

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'VERBOSE';

/**
 * Structured JSON logger for distributed-system observability.
 *
 * Every log line is a single-line JSON object written to stdout (INFO/WARN/DEBUG/VERBOSE)
 * or stderr (ERROR), making it directly ingestible by ELK, Datadog, and CloudWatch.
 *
 * Context fields (transactionId, correlationId, spanId, httpMethod, httpPath,
 * kafkaTopic, kafkaPartition, kafkaOffset) are automatically read from the
 * AsyncLocalStorage scope set by TraceInterceptor — no manual propagation needed.
 *
 * Usage:
 *   // NestJS-style (preferred)
 *   private readonly logger = new AppLoggerService(MyService.name);
 *
 *   // As global NestJS app logger (in main.ts)
 *   app.useLogger(new AppLoggerService('Bootstrap'));
 *
 * Extra fields included for distributed-system monitoring:
 *   - transactionId   — per-request UUID for this service
 *   - correlationId   — cross-service trace ID (from X-Correlation-ID header)
 *   - spanId          — sub-operation ID (set via enrichLogContext())
 *   - service         — logical service name
 *   - environment     — NODE_ENV value
 *   - hostname        — container/pod host for Kubernetes workloads
 *   - pid             — process ID for multi-process deployments
 *   - httpMethod/Path — HTTP request lifecycle
 *   - kafkaTopic/…    — Kafka message processing context
 */
@Injectable()
export class AppLoggerService implements LoggerService {

  constructor(private readonly defaultContext?: string) {}

  log(message: unknown, context?: string): void {
    this.write('INFO', message, context);
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.write('ERROR', message, context, trace);
  }

  warn(message: unknown, context?: string): void {
    this.write('WARN', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.write('DEBUG', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.write('VERBOSE', message, context);
  }

  private write(
    level:    LogLevel,
    message:  unknown,
    context?: string,
    stack?:   string,
  ): void {
    const ctx = getLogContext();

    const entry: Record<string, unknown> = {
      timestamp:   new Date().toISOString(),
      level,
      pid:         process.pid,
      context:     context ?? this.defaultContext,
      message,
    };

    if (ctx.transactionId)              entry['transactionId']   = ctx.transactionId;
    if (ctx.correlationId)              entry['correlationId']   = ctx.correlationId;
    if (ctx.spanId)                     entry['spanId']          = ctx.spanId;
    if (ctx.httpMethod)                 entry['httpMethod']      = ctx.httpMethod;
    if (ctx.httpPath)                   entry['httpPath']        = ctx.httpPath;
    if (ctx.kafkaTopic)                 entry['kafkaTopic']      = ctx.kafkaTopic;
    if (ctx.kafkaPartition !== undefined) entry['kafkaPartition'] = ctx.kafkaPartition;
    if (ctx.kafkaOffset)                entry['kafkaOffset']     = ctx.kafkaOffset;
    if (stack)                          entry['stack']           = stack;

    const stream = level === 'ERROR' ? process.stderr : process.stdout;
    stream.write(JSON.stringify(entry) + '\n');
  }
}
