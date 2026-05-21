/**
 * @author Andres Duran
 * @version 0.1
 * @since 2026-05-20
 */
import { AsyncLocalStorage, createHook, executionAsyncId } from 'async_hooks'
import { randomUUID } from 'crypto'
import { LogContext } from './log-context.interface'

// ---------------------------------------------------------------------------
// Tier 1 — AsyncLocalStorage
// ---------------------------------------------------------------------------
/**
 * Primary store: scoped to every HTTP request or Kafka message handled by
 * TraceInterceptor. Context propagates automatically to all async continuations
 * (Promises, callbacks) that start inside a `runWithLogContext()` call.
 *
 * Limitation: does NOT reach detached executions (setInterval, cron, worker
 * threads) because they are created outside the `run()` scope.
 */
export const loggerStorage = new AsyncLocalStorage<LogContext>()

// ---------------------------------------------------------------------------
// Tier 2 — Detached-execution registry (Map<asyncId, LogContext>)
// ---------------------------------------------------------------------------
/**
 * Secondary store: covers executions that run outside any ALS scope
 * (e.g. setInterval callbacks in OutboxRelayService, cron jobs).
 *
 * The async hook mirrors what AsyncLocalStorage does internally:
 *  - init   → when a new async resource is created (new Promise, setTimeout…),
 *             inherit the parent's context so it remains stable across every
 *             `await` boundary within the same operation.
 *  - destroy → clean up when the async resource is garbage-collected to
 *              prevent memory leaks.
 *
 * Auto-seeding: if getLogContext() is called from a context that has no
 * entry in either store, a fresh LogContext is generated and registered for
 * the current asyncId — ensuring all child async operations inherit it too.
 */
const detachedRegistry = new Map<number, LogContext>()

createHook({
  init (asyncId: number, _type: string, triggerAsyncId: number): void {
    if (detachedRegistry.has(triggerAsyncId)) {
      detachedRegistry.set(asyncId, detachedRegistry.get(triggerAsyncId)!)
    }
  },
  destroy (asyncId: number): void {
    detachedRegistry.delete(asyncId)
  },
}).enable()

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Runs `fn` within an isolated AsyncLocalStorage scope carrying `ctx`.
 * All async continuations started inside `fn` inherit the context automatically.
 */
export function runWithLogContext<T> (ctx: LogContext, fn: () => T): T {
  return loggerStorage.run(ctx, fn)
}

/**
 * Returns the active LogContext for the current async execution.
 *
 * Resolution order:
 *  1. AsyncLocalStorage — populated by TraceInterceptor for HTTP / Kafka requests.
 *  2. Detached registry  — populated automatically for background executions
 *     (setInterval, cron, etc.) via the async hook propagation.
 *  3. Auto-seed          — if neither store has an entry, a fresh LogContext is
 *     generated, registered under the current asyncId, and returned. All child
 *     async operations will inherit this context through the hook.
 *
 * Always returns a complete LogContext — correlationId and transactionId are
 * never undefined.
 */
export function getLogContext (): LogContext {
  // 1. ALS — request-scoped (HTTP / Kafka via TraceInterceptor)
  const alsStore = loggerStorage.getStore()
  if (alsStore) return alsStore

  // 2. Detached registry — background executions with propagated context
  const asyncId = executionAsyncId()
  const registryEntry = detachedRegistry.get(asyncId)
  if (registryEntry) return registryEntry

  // 3. Auto-seed — first call in a brand-new detached execution
  const freshCtx = buildInitialContext()
  detachedRegistry.set(asyncId, freshCtx)
  return freshCtx
}

/**
 * Merges `partial` into the active context (mutates in place).
 * Works for both ALS-scoped and detached-registry contexts.
 */
export function enrichLogContext (partial: Partial<LogContext>): void {
  const alsStore = loggerStorage.getStore()
  if (alsStore) {
    Object.assign(alsStore, partial)
    return
  }
  const registryEntry = detachedRegistry.get(executionAsyncId())
  if (registryEntry) Object.assign(registryEntry, partial)
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
  }
}
