/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { Injectable, LoggerService } from '@nestjs/common'
import { getLogContext } from './logger.storage'

type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'VERBOSE';

@Injectable()
export class AppLoggerService implements LoggerService {

  constructor (private readonly defaultContext?: string) {}

  log (message: unknown, context?: string): void {
    this.write('INFO', message, context)
  }

  error (message: unknown, trace?: string, context?: string): void {
    this.write('ERROR', message, context, trace)
  }

  warn (message: unknown, context?: string): void {
    this.write('WARN', message, context)
  }

  debug (message: unknown, context?: string): void {
    this.write('DEBUG', message, context)
  }

  verbose (message: unknown, context?: string): void {
    this.write('VERBOSE', message, context)
  }

  private write (
    level: LogLevel,
    message: unknown,
    context?: string,
    stack?: string,
  ): void {
    const ctx = getLogContext()

    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      correlationId: ctx.correlationId,
      context: context ?? this.defaultContext,
      message,
    }

    if (ctx.transactionId) entry['transactionId'] = ctx.transactionId
    if (ctx.spanId) entry['spanId'] = ctx.spanId
    if (ctx.kafkaTopic) entry['kafkaTopic'] = ctx.kafkaTopic
    if (ctx.kafkaPartition !== undefined) entry['kafkaPartition'] = ctx.kafkaPartition
    if (ctx.kafkaOffset) entry['kafkaOffset'] = ctx.kafkaOffset
    if (stack) entry['stack'] = stack

    const stream = level === 'ERROR' ? process.stderr : process.stdout
    stream.write(JSON.stringify(entry) + '\n')
  }
}
