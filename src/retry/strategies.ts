import { RetryStrategy } from '../types'
import { RelayError, RelayErrorCode } from '../types'

export class ExponentialBackoff implements RetryStrategy {
  constructor(
    private maxAttempts: number = 5,
    private baseDelay: number = 1000,
    private maxDelay: number = 30000
  ) {}

  shouldRetry(error: RelayError, attempt: number): boolean {
    if (attempt >= this.maxAttempts) return false

    const nonRetryableCodes = [
      RelayErrorCode.INSUFFICIENT_FUNDS,
      RelayErrorCode.INVALID_SIGNATURE,
      RelayErrorCode.PERMANENT_REVERT,
    ]
    return !nonRetryableCodes.includes(error.code)
  }

  getDelay(attempt: number): number {
    const delay = Math.min(this.maxDelay, this.baseDelay * Math.pow(2, attempt))
    return delay * (0.75 + Math.random() * 0.5) // Add jitter
  }
}
