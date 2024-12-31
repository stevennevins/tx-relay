/** A client for relaying transactions with automatic gas estimation, nonce management, and retry capabilities */
export { RelayClient } from './RelayClient'

// Strategy exports
/** Creates a gas strategy based on the chain and configuration provided.
 * For EIP-1559 compatible chains, it will create an EIP1559GasStrategy, otherwise a LegacyGasStrategy
 */
export { createGasStrategy } from './gas/strategies'
/** A retry strategy that implements exponential backoff with configurable base delay and max attempts */
export { ExponentialBackoff } from './retry/strategies'

// Utility exports
/** Checks if an account has sufficient balance to execute a transaction */
export { checkBalance } from './preflight/checkBalance'
/** Manages transaction lifecycle hooks for monitoring and reacting to transaction events */
export { HooksManager } from './hooks/HooksManager'

// Type exports from viem
/** @see https://viem.sh/docs/accounts/types.html */
export type {
  Account,
  Chain,
  TransactionRequest,
  TransactionReceipt,
  Hash,
} from 'viem'

// Type exports
/** Configuration options for the RelayClient */
export type { RelayConfig } from './types'
/** Result type containing either successful data or an error */
export type { RelayResult } from './types'
/** Gas-related parameters for transaction execution */
export type { GasParameters } from './types'
/** Configuration for EIP-1559 gas estimation */
export type { EIP1559Config } from './types'
/** Hooks for transaction lifecycle events */
export type { TransactionHooks } from './types'
/** Interface for implementing custom gas estimation strategies */
export type { GasStrategy } from './types'
/** Interface for implementing custom retry strategies */
export type { RetryStrategy } from './types'

// Error exports
/** Custom error types and codes for relay-specific errors */
export { RelayError, RelayErrorCode } from './types'
