import { RelayError, RelayErrorCode } from '../types'

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
