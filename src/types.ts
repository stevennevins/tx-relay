import {
  Account,
  Chain,
  TransactionRequest,
  TransactionReceipt,
  Hash,
} from 'viem'

export type {
  TransactionRequest,
  TransactionReceipt,
  Hash,
}

export type RelayConfig = {
  rpcUrl: string
  account: Account
  chain: Chain
  maxRetries?: number
  timeout?: number
  hooks?: TransactionHooks
  gasStrategy?: GasStrategy
  retryStrategy?: RetryStrategy
  preflightChecks?: {
    checkBalance?: boolean
    minBalanceRequired?: bigint
  }
}

export type RelayResult<T> = {
  data?: T
  error?: RelayError
}

export type GasParameters = {
  gasPrice?: bigint
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
}

export type EIP1559Config = {
  baseFeeMultiplier?: number
  priorityFeeMultiplier?: number
  minPriorityFee?: bigint
  maxPriorityFee?: bigint
  maxTotalFee?: bigint
  percentile?: number
  blockHistory?: number
}

export interface TransactionHooks {
  beforeTransaction?: (tx: TransactionRequest) => Promise<void>
  afterTransaction?: (receipt: TransactionReceipt) => Promise<void>
  onTransactionBroadcast?: (hash: Hash) => Promise<void>
  onTransactionConfirmed?: (receipt: TransactionReceipt) => Promise<void>
  onError?: (error: RelayError) => Promise<void>
}

export interface GasStrategy {
  getGasParameters(): Promise<RelayResult<GasParameters>>
}

export interface RetryStrategy {
  shouldRetry(error: RelayError, attempt: number): boolean
  getDelay(attempt: number): number
}

export enum RelayErrorCode {
  TRANSACTION_FAILED,
  GAS_ESTIMATION_FAILED,
  NONCE_ERROR,
  INSUFFICIENT_FUNDS,
  INVALID_SIGNATURE,
  PERMANENT_REVERT,
  TEMPORARY_FAILURE,
  TIMEOUT,
}

export class RelayError extends Error {
  constructor(
    message: string,
    public code: RelayErrorCode,
    public details?: unknown
  ) {
    super(message)
  }
}
