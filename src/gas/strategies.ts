import { Chain, PublicClient } from 'viem'
import {
  GasStrategy,
  GasParameters,
  RelayResult,
  RelayError,
  RelayErrorCode,
  EIP1559Config,
} from '../types'

/**
 * A gas strategy for legacy (pre-EIP-1559) transactions
 * Uses the network's gas price with an optional multiplier
 */
export class LegacyGasStrategy implements GasStrategy {
  /**
   * @param client - The viem public client to use for gas estimation
   * @param multiplier - Optional multiplier to apply to the gas price (default: 1)
   */
  constructor(
    private client: PublicClient,
    private multiplier: number = 1
  ) { }

  /**
   * Gets the current gas parameters using legacy gas pricing
   * @returns Gas parameters with only gasPrice set
   */
  async getGasParameters(): Promise<RelayResult<GasParameters>> {
    try {
      const gasPrice = await this.client.getGasPrice()
      return {
        data: {
          gasPrice: BigInt(Math.ceil(Number(gasPrice) * this.multiplier)),
          maxFeePerGas: undefined,
          maxPriorityFeePerGas: undefined,
        },
      }
    } catch (error) {
      return {
        error: new RelayError(
          'Failed to get gas price',
          RelayErrorCode.GAS_ESTIMATION_FAILED,
          error
        ),
      }
    }
  }
}

/**
 * A gas strategy for EIP-1559 transactions
 * Estimates maxFeePerGas and maxPriorityFeePerGas based on network conditions
 */
export class EIP1559GasStrategy implements GasStrategy {
  private config: Required<EIP1559Config>

  /**
   * @param client - The viem public client to use for gas estimation
   * @param config - Optional configuration for fee calculation
   */
  constructor(
    private client: PublicClient,
    config: EIP1559Config = {}
  ) {
    this.config = {
      baseFeeMultiplier: config.baseFeeMultiplier ?? 2,
      priorityFeeMultiplier: config.priorityFeeMultiplier ?? 1.5,
      minPriorityFee: config.minPriorityFee ?? 1_000_000_000n,
      maxPriorityFee: config.maxPriorityFee ?? 500_000_000_000n,
      maxTotalFee: config.maxTotalFee ?? 1_000_000_000_000n,
      percentile: config.percentile ?? 50,
      blockHistory: config.blockHistory ?? 20,
    }
  }

  /**
   * Gets the current gas parameters using EIP-1559 gas pricing
   * @returns Gas parameters with maxFeePerGas and maxPriorityFeePerGas set
   */
  async getGasParameters(): Promise<RelayResult<GasParameters>> {
    try {
      const [block, feeHistory] = await Promise.all([
        this.client.getBlock(),
        this.client.getFeeHistory({
          blockCount: this.config.blockHistory,
          rewardPercentiles: [this.config.percentile],
        }),
      ])

      const baseFeePerGas = block.baseFeePerGas!
      const priorityFees = feeHistory.reward?.map(r => r[0]) ?? []
      const medianPriorityFee =
        priorityFees.length > 0
          ? priorityFees[Math.floor(priorityFees.length / 2)]
          : this.config.minPriorityFee

      let maxPriorityFeePerGas = BigInt(
        Math.ceil(Number(medianPriorityFee) * this.config.priorityFeeMultiplier)
      )

      // Apply priority fee bounds
      maxPriorityFeePerGas =
        maxPriorityFeePerGas < this.config.minPriorityFee
          ? this.config.minPriorityFee
          : maxPriorityFeePerGas

      maxPriorityFeePerGas =
        maxPriorityFeePerGas > this.config.maxPriorityFee
          ? this.config.maxPriorityFee
          : maxPriorityFeePerGas

      // Calculate max fee
      let maxFeePerGas =
        baseFeePerGas * BigInt(Math.ceil(this.config.baseFeeMultiplier)) +
        maxPriorityFeePerGas

      // Apply total fee cap
      maxFeePerGas =
        maxFeePerGas > this.config.maxTotalFee
          ? this.config.maxTotalFee
          : maxFeePerGas

      return {
        data: {
          gasPrice: undefined,
          maxFeePerGas,
          maxPriorityFeePerGas,
        },
      }
    } catch (error) {
      return {
        error: new RelayError(
          'Failed to get EIP-1559 gas parameters',
          RelayErrorCode.GAS_ESTIMATION_FAILED,
          error
        ),
      }
    }
  }
}

/**
 * Creates an appropriate gas strategy based on the chain and configuration
 * @param client - The viem public client to use for gas estimation
 * @param chain - The chain configuration
 * @param config - Either an EIP1559 configuration object or a number to use as a multiplier for legacy transactions
 * @returns A gas strategy appropriate for the chain
 */
export function createGasStrategy(
  client: PublicClient,
  chain: Chain,
  config?: EIP1559Config | number
): GasStrategy {
  const supportsEIP1559 = 'eip1559' in chain && chain.eip1559

  if (!supportsEIP1559) {
    const multiplier = typeof config === 'number' ? config : 1
    return new LegacyGasStrategy(client, multiplier)
  }

  const eip1559Config = typeof config === 'object' ? config : {}
  return new EIP1559GasStrategy(client, eip1559Config)
}
