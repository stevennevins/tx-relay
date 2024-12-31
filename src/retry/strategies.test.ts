import { describe, it, expect } from 'vitest'
import { ExponentialBackoff } from './strategies'
import { RelayError, RelayErrorCode } from '../types'

describe('ExponentialBackoff', () => {
  it('should not retry after max attempts', () => {
    const strategy = new ExponentialBackoff(3)
    const error = new RelayError('Test error', RelayErrorCode.TRANSACTION_FAILED)

    expect(strategy.shouldRetry(error, 3)).toBe(false)
  })

  it('should not retry for non-retryable errors', () => {
    const strategy = new ExponentialBackoff()
    const nonRetryableErrors = [
      RelayErrorCode.INSUFFICIENT_FUNDS,
      RelayErrorCode.INVALID_SIGNATURE,
      RelayErrorCode.PERMANENT_REVERT,
    ]

    nonRetryableErrors.forEach(code => {
      const error = new RelayError('Test error', code)
      expect(strategy.shouldRetry(error, 0)).toBe(false)
    })
  })

  it('should retry for retryable errors within max attempts', () => {
    const strategy = new ExponentialBackoff()
    const error = new RelayError('Test error', RelayErrorCode.TRANSACTION_FAILED)

    expect(strategy.shouldRetry(error, 0)).toBe(true)
    expect(strategy.shouldRetry(error, 3)).toBe(true)
    expect(strategy.shouldRetry(error, 5)).toBe(false)
  })

  it('should calculate exponential delay with jitter', () => {
    const strategy = new ExponentialBackoff(5, 1000, 30000)

    // Test multiple attempts to ensure delay increases exponentially
    const delays = [0, 1, 2, 3].map(attempt => strategy.getDelay(attempt))

    // Verify each delay is within expected bounds
    delays.forEach((delay, index) => {
      const baseDelay = 1000 * Math.pow(2, index)
      const minDelay = baseDelay * 0.75
      const maxDelay = baseDelay * 1.25

      expect(delay).toBeGreaterThanOrEqual(minDelay)
      expect(delay).toBeLessThanOrEqual(maxDelay)
    })
  })

  it('should respect max delay', () => {
    const maxDelay = 5000
    const strategy = new ExponentialBackoff(5, 1000, maxDelay)

    // Test an attempt that would exceed maxDelay without the cap
    const delay = strategy.getDelay(4) // Would be 16000ms without cap

    expect(delay).toBeLessThanOrEqual(maxDelay)
  })
})