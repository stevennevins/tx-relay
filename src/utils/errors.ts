import { RelayError, RelayErrorCode } from '../types'

/**
 * Classifies an unknown error into a structured RelayError
 * Analyzes error messages to determine the appropriate error code and creates a RelayError instance
 * Error classification helps determine retry strategies and error handling behavior
 *
 * Error codes are classified as follows:
 * - INSUFFICIENT_FUNDS: When the account lacks funds for the transaction
 * - INVALID_SIGNATURE: When there are signature or sender validation issues
 * - PERMANENT_REVERT: When the transaction is permanently rejected (e.g., invalid opcode, reverts)
 * - TEMPORARY_FAILURE: For transient issues (timeouts, network issues, nonce conflicts)
 *
 * @param error - The error to classify, can be any type
 * @returns A RelayError instance with appropriate error code and context
 */
export function classifyError(error: unknown): RelayError {
  if (error instanceof RelayError) return error

  const message = error instanceof Error ? error.message : String(error)

  if (message.includes('insufficient funds')) {
    return new RelayError(message, RelayErrorCode.INSUFFICIENT_FUNDS, error)
  }

  if (
    message.includes('invalid signature') ||
    message.includes('invalid sender')
  ) {
    return new RelayError(message, RelayErrorCode.INVALID_SIGNATURE, error)
  }

  if (
    message.includes('invalid opcode') ||
    message.includes('execution reverted') ||
    message.includes('revert') ||
    message.includes('unauthorized')
  ) {
    return new RelayError(message, RelayErrorCode.PERMANENT_REVERT, error)
  }

  if (
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('rate limit') ||
    message.includes('nonce too low')
  ) {
    return new RelayError(message, RelayErrorCode.TEMPORARY_FAILURE, error)
  }

  return new RelayError(message, RelayErrorCode.TEMPORARY_FAILURE, error)
}
