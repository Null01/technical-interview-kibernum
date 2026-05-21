/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { AsyncLocalStorage } from 'async_hooks'
import { randomUUID }        from 'crypto'
import { LogContext }        from './log-context.interface'

/**
 * Module-level singleton AsyncLocalStorage for log/trace context.
 *
 * Using a singleton (not NestJS-injectable) allows AppLoggerService to read
 * the context both from injected instances AND from `new AppLoggerService()`,
 * making it usable before the NestJS DI container boots (e.g. in main.ts).
 */
export const loggerStorage = new AsyncLocalStorage<LogContext>()

/**
 * Runs `fn` within an isolated AsyncLocalStorage scope carrying `ctx`.
 * All async continuations started inside `fn` inherit the context automatically.
 */
export function runWithLogContext<T> (ctx: LogContext, fn: () => T): T {
  return loggerStorage.run(ctx, fn)
}

/** Returns the current context, or an empty object when no context is active. */
export function getLogContext (): Partial<LogContext> {
  return loggerStorage.getStore() ?? {}
}

/**
 * Merges `partial` into the active context (mutates in place).
 * No-op if called outside a `runWithLogContext` scope.
 */
export function enrichLogContext (partial: Partial<LogContext>): void {
  const store = loggerStorage.getStore()
  if (store) Object.assign(store, partial)
}

/**
 * Builds a fresh `LogContext` for the start of an operation.
 *
 * @param correlationId  Cross-service correlation ID received from the caller.
 *                       If absent (this service is the originator), a new UUID
 *                       is generated and used for both fields.
 */
export function buildInitialContext (correlationId?: string): LogContext {
  const transactionId = randomUUID()
  return {
    transactionId,
    correlationId: correlationId ?? transactionId,
    service: process.env.SERVICE_NAME ?? 'payments-ms',
  }
}
