import { RetryStrategy } from '../types'
import { RelayError, RelayErrorCode } from '../types'

/**
 * Implements an exponential backoff retry strategy with jitter
 * This strategy increases the delay between retries exponentially while adding random jitter
 * to prevent thundering herd problems in distributed systems
 */
export class ExponentialBackoff implements RetryStrategy {
  /**
   * Creates a new ExponentialBackoff instance
   * @param maxAttempts - Maximum number of retry attempts (default: 5)
   * @param baseDelay - Base delay in milliseconds before applying exponential backoff (default: 1000)
   * @param maxDelay - Maximum delay in milliseconds between retries (default: 30000)
   */
  constructor(
    private maxAttempts: number = 5,
    private baseDelay: number = 1000,
    private maxDelay: number = 30000
  ) { }

  /**
   * Determines if a retry should be attempted based on the error and current attempt number
   * @param error - The error that occurred during the operation
   * @param attempt - The current attempt number (0-based)
   * @returns true if the operation should be retried, false otherwise
   */
  shouldRetry(error: RelayError, attempt: number): boolean {
    if (attempt >= this.maxAttempts) return false

    const nonRetryableCodes = [
      RelayErrorCode.INSUFFICIENT_FUNDS,
      RelayErrorCode.INVALID_SIGNATURE,
      RelayErrorCode.PERMANENT_REVERT,
    ]
    return !nonRetryableCodes.includes(error.code)
  }

  /**
   * Calculates the delay before the next retry attempt
   * Uses exponential backoff with jitter to prevent thundering herd problems
   * @param attempt - The current attempt number (0-based)
   * @returns The delay in milliseconds before the next retry
   */
  getDelay(attempt: number): number {
    const baseDelay = this.baseDelay * Math.pow(2, attempt)
    const jitteredDelay = baseDelay * (0.75 + Math.random() * 0.5) // Add jitter
    return Math.min(this.maxDelay, jitteredDelay)
  }
}
