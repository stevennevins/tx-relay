import {
  createPublicClient,
  createWalletClient,
  http,
  PublicClient,
  WalletClient,
  Hash,
  TransactionRequest,
  TransactionReceipt,
  type EstimateGasParameters,
  type SendTransactionParameters,
} from 'viem'
import { RelayConfig, RelayResult } from './types'
import { classifyError } from './utils/errors'
import { createGasStrategy } from './gas/strategies'
import { ExponentialBackoff } from './retry/strategies'
import { NonceManager } from './nonce/NonceManager'
import { HooksManager } from './hooks/HooksManager'
import { checkBalance } from './preflight/checkBalance'

/**
 * RelayClient provides a high-level interface for sending transactions with automatic:
 * - Gas estimation and price management
 * - Nonce management
 * - Transaction retry logic
 * - Balance checking
 * - Transaction lifecycle hooks
 */
export class RelayClient {
  private publicClient: PublicClient
  private walletClient: WalletClient
  private nonceManager: NonceManager
  private hooksManager: HooksManager
  private readonly config: Required<
    Pick<RelayConfig, 'gasStrategy' | 'retryStrategy'>
  > &
    RelayConfig

  /**
   * Creates a new RelayClient instance
   * @param config - Configuration options for the relay client
   */
  constructor(config: RelayConfig) {
    const transport = http(config.rpcUrl)

    this.publicClient = createPublicClient({
      chain: config.chain,
      transport,
    })

    this.walletClient = createWalletClient({
      chain: config.chain,
      transport,
      account: config.account,
    })

    this.nonceManager = new NonceManager(
      this.publicClient,
      this.walletClient.account!.address
    )

    this.hooksManager = new HooksManager(config.hooks)

    this.config = {
      ...config,
      gasStrategy:
        config.gasStrategy ??
        createGasStrategy(this.publicClient, config.chain),
      retryStrategy:
        config.retryStrategy ?? new ExponentialBackoff(config.maxRetries),
    }
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    attempt = 0
  ): Promise<RelayResult<T>> {
    try {
      const result = await operation()
      return { data: result }
    } catch (error) {
      const classifiedError = classifyError(error)

      if (!this.config.retryStrategy.shouldRetry(classifiedError, attempt)) {
        return { error: classifiedError }
      }

      const delay = this.config.retryStrategy.getDelay(attempt)
      await new Promise(resolve => setTimeout(resolve, delay))

      return this.withRetry(operation, attempt + 1)
    }
  }

  /**
   * Estimates the gas required for a transaction
   * @param tx - The transaction to estimate gas for
   * @returns A RelayResult containing the estimated gas amount or an error
   */
  async estimateGas(tx: TransactionRequest): Promise<RelayResult<bigint>> {
    return this.withRetry(async () => {
      const params = {
        ...tx,
        account: this.config.account,
        type: 'eip1559',
      } as unknown as EstimateGasParameters
      return this.publicClient.estimateGas(params)
    })
  }

  /**
   * Sends a transaction through the relay
   * @param tx - The transaction to send
   * @returns A RelayResult containing the transaction hash or an error
   */
  async sendTransaction(tx: TransactionRequest): Promise<RelayResult<Hash>> {
    try {
      const [gasResult, gasParamsResult] = await Promise.all([
        this.estimateGas(tx),
        this.config.gasStrategy.getGasParameters(),
      ])

      if (gasResult.error) {
        return { error: gasResult.error }
      }
      if (gasParamsResult.error) {
        return { error: gasParamsResult.error }
      }

      const estimatedGas = gasResult.data
      const gasParams = gasParamsResult.data

      if (!estimatedGas || !gasParams) {
        return { error: classifyError('Failed to get gas parameters') }
      }

      if (this.config.preflightChecks?.checkBalance) {
        const totalGas =
          estimatedGas * (gasParams.gasPrice ?? gasParams.maxFeePerGas!)
        const balanceCheck = await checkBalance(
          this.publicClient,
          this.walletClient.account!.address,
          totalGas,
          this.config.preflightChecks?.minBalanceRequired
        )
        if (balanceCheck.error) {
          return { error: balanceCheck.error }
        }
      }

      await this.hooksManager.runBeforeTransaction(tx)

      const nonce = await this.nonceManager.getNextNonce()
      const preparedTx = {
        ...tx,
        nonce,
        gas: estimatedGas,
        ...(gasParams.gasPrice ? { gasPrice: gasParams.gasPrice } : {}),
        ...(gasParams.maxFeePerGas ? { maxFeePerGas: gasParams.maxFeePerGas, maxPriorityFeePerGas: gasParams.maxPriorityFeePerGas } : {}),
        account: this.config.account,
        chain: this.config.chain,
      } as unknown as SendTransactionParameters

      const hash = await this.walletClient.sendTransaction(preparedTx)

      await this.hooksManager.runOnTransactionBroadcast(hash)

      const receipt = await this.waitForTransaction(hash)
      if (receipt.error) {
        await this.nonceManager.reset()
        return { error: receipt.error }
      }

      if (receipt.data?.status === 'success') {
        await this.hooksManager.runOnTransactionConfirmed(receipt.data)
      }

      await this.hooksManager.runAfterTransaction(receipt.data!)

      return { data: hash }
    } catch (error) {
      await this.nonceManager.reset()

      const relayError = classifyError(error)
      await this.hooksManager.runOnError(relayError)

      return { error: relayError }
    }
  }

  /**
   * Waits for a transaction to be mined and returns the receipt
   * @param hash - The transaction hash to wait for
   * @returns A RelayResult containing the transaction receipt or an error
   */
  async waitForTransaction(
    hash: Hash
  ): Promise<RelayResult<TransactionReceipt>> {
    return this.withRetry(() =>
      this.publicClient.waitForTransactionReceipt({
        hash,
        timeout: this.config.timeout,
      })
    )
  }
}
