import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PublicClient } from 'viem'
import { LegacyGasStrategy, EIP1559GasStrategy } from './strategies'
import { RelayErrorCode } from '../types'

// Mock client
const mockClient = {
  getGasPrice: vi.fn(),
  getBlock: vi.fn(),
  getFeeHistory: vi.fn(),
} satisfies Partial<PublicClient> as unknown as PublicClient

describe('LegacyGasStrategy', () => {
  let strategy: LegacyGasStrategy

  beforeEach(() => {
    vi.clearAllMocks()
    strategy = new LegacyGasStrategy(mockClient, 1.1)
  })

  it('should return gas price with multiplier', async () => {
    mockClient.getGasPrice.mockResolvedValue(100000000000n)

    const result = await strategy.getGasParameters()

    expect(result.error).toBeUndefined()
    expect(result.data).toEqual({
      gasPrice: 110000000001n,
      maxFeePerGas: undefined,
      maxPriorityFeePerGas: undefined,
    })
  })

  it('should handle errors', async () => {
    mockClient.getGasPrice.mockRejectedValue(new Error('RPC Error'))

    const result = await strategy.getGasParameters()

    expect(result.data).toBeUndefined()
    expect(result.error?.code).toBe(RelayErrorCode.GAS_ESTIMATION_FAILED)
  })
})

describe('EIP1559GasStrategy', () => {
  let strategy: EIP1559GasStrategy

  beforeEach(() => {
    vi.clearAllMocks()
    strategy = new EIP1559GasStrategy(mockClient, {
      baseFeeMultiplier: 2,
      priorityFeeMultiplier: 1.5,
      minPriorityFee: 1000000000n,
      maxPriorityFee: 500000000000n,
      maxTotalFee: 1000000000000n,
    })
  })

  it('should calculate EIP1559 parameters correctly', async () => {
    mockClient.getBlock.mockResolvedValue({
      baseFeePerGas: 100000000000n,
    })
    mockClient.getFeeHistory.mockResolvedValue({
      reward: [[2000000000n]],
    })

    const result = await strategy.getGasParameters()

    expect(result.error).toBeUndefined()
    expect(result.data).toEqual({
      gasPrice: undefined,
      maxFeePerGas: 203000000000n, // (100000000000n * 2) + 3000000000n
      maxPriorityFeePerGas: 3000000000n, // 2000000000n * 1.5
    })
  })

  it('should apply priority fee bounds', async () => {
    mockClient.getBlock.mockResolvedValue({
      baseFeePerGas: 100000000000n,
    })
    mockClient.getFeeHistory.mockResolvedValue({
      reward: [[500000000n]], // Very low priority fee
    })

    const result = await strategy.getGasParameters()

    expect(result.error).toBeUndefined()
    expect(result.data?.maxPriorityFeePerGas).toBe(1000000000n) // Should use minPriorityFee
  })

  it('should handle errors', async () => {
    mockClient.getBlock.mockRejectedValue(new Error('RPC Error'))

    const result = await strategy.getGasParameters()

    expect(result.data).toBeUndefined()
    expect(result.error?.code).toBe(RelayErrorCode.GAS_ESTIMATION_FAILED)
  })
})