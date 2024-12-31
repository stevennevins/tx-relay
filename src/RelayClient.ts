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
import { Mutex } from 'async-mutex'
import { RelayConfig, RelayResult } from './types'
import { classifyError } from './utils/errors'
import { createGasStrategy } from './gas/strategies'
import { ExponentialBackoff } from './retry/strategies'

export class RelayClient {
  private publicClient: PublicClient
  private walletClient: WalletClient
  private nonceMutex = new Mutex()
  private currentNonce: number | null = null
  private readonly config: Required<
    Pick<RelayConfig, 'gasStrategy' | 'retryStrategy'>
  > &
    RelayConfig

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

    this.config = {
      ...config,
      gasStrategy:
        config.gasStrategy ??
        createGasStrategy(this.publicClient, config.chain),
      retryStrategy:
        config.retryStrategy ?? new ExponentialBackoff(config.maxRetries),
    }
  }

  private async getNextNonce(): Promise<number> {
    return this.nonceMutex.runExclusive(async () => {
      if (this.currentNonce === null) {
        this.currentNonce = await this.publicClient.getTransactionCount({
          address: this.walletClient.account!.address,
        })
      } else {
        this.currentNonce++
      }
      return this.currentNonce
    })
  }

  private async checkBalance(
    requiredAmount: bigint
  ): Promise<RelayResult<void>> {
    const address = this.walletClient.account!.address
    const balance = await this.publicClient.getBalance({ address })
    const minRequired =
      this.config.preflightChecks?.minBalanceRequired ?? requiredAmount

    if (balance < minRequired) {
      return {
        error: classifyError(
          `Insufficient balance. Required: ${minRequired}, Available: ${balance}`
        ),
      }
    }
    return { data: undefined }
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
        const balanceCheck = await this.checkBalance(totalGas)
        if (balanceCheck.error) {
          return { error: balanceCheck.error }
        }
      }

      if (this.config.hooks?.beforeTransaction) {
        await this.config.hooks.beforeTransaction(tx)
      }

      const nonce = await this.getNextNonce()
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

      if (this.config.hooks?.onTransactionBroadcast) {
        await this.config.hooks.onTransactionBroadcast(hash)
      }

      const receipt = await this.waitForTransaction(hash)
      if (receipt.error) {
        await this.nonceMutex.runExclusive(() => {
          this.currentNonce = null
        })
        return { error: receipt.error }
      }

      if (
        receipt.data?.status === 'success' &&
        this.config.hooks?.onTransactionConfirmed
      ) {
        await this.config.hooks.onTransactionConfirmed(receipt.data)
      }

      if (this.config.hooks?.afterTransaction && receipt.data) {
        await this.config.hooks.afterTransaction(receipt.data)
      }

      return { data: hash }
    } catch (error) {
      await this.nonceMutex.runExclusive(() => {
        this.currentNonce = null
      })

      const relayError = classifyError(error)
      if (this.config.hooks?.onError) {
        await this.config.hooks.onError(relayError)
      }

      return { error: relayError }
    }
  }

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
