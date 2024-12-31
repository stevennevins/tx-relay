import { describe, it, expect, vi } from 'vitest'
import { type PublicClient } from 'viem'
import { checkBalance } from './checkBalance'

// Mock viem's createPublicClient
vi.mock('viem', async () => {
  const actual = await vi.importActual('viem')
  return {
    ...actual,
    createPublicClient: vi.fn(),
  }
})

describe('checkBalance', () => {
  const mockAddress = '0x1234567890123456789012345678901234567890' as const

  it('should pass when balance is greater than required amount', async () => {
    const mockPublicClient = {
      getBalance: vi.fn().mockResolvedValue(200n),
    } as unknown as PublicClient

    const result = await checkBalance(
      mockPublicClient,
      mockAddress,
      100n
    )

    expect(result.error).toBeUndefined()
    expect(result.data).toBeUndefined()
    expect(mockPublicClient.getBalance).toHaveBeenCalledWith({
      address: mockAddress
    })
  })

  it('should pass when balance equals required amount', async () => {
    const mockPublicClient = {
      getBalance: vi.fn().mockResolvedValue(100n),
    } as unknown as PublicClient

    const result = await checkBalance(
      mockPublicClient,
      mockAddress,
      100n
    )

    expect(result.error).toBeUndefined()
    expect(result.data).toBeUndefined()
  })

  it('should fail when balance is less than required amount', async () => {
    const mockPublicClient = {
      getBalance: vi.fn().mockResolvedValue(50n),
    } as unknown as PublicClient

    const result = await checkBalance(
      mockPublicClient,
      mockAddress,
      100n
    )

    if (!result.error) throw new Error('Expected error to be defined')
    expect(result.error.message).toContain('Insufficient balance')
    expect(result.data).toBeUndefined()
  })

  it('should use minBalanceRequired when provided', async () => {
    const mockPublicClient = {
      getBalance: vi.fn().mockResolvedValue(150n),
    } as unknown as PublicClient

    const result = await checkBalance(
      mockPublicClient,
      mockAddress,
      100n,
      200n
    )

    if (!result.error) throw new Error('Expected error to be defined')
    expect(result.error.message).toContain('Insufficient balance')
    expect(result.data).toBeUndefined()
  })

  it('should handle getBalance errors', async () => {
    const mockPublicClient = {
      getBalance: vi.fn().mockRejectedValue(new Error('RPC Error')),
    } as unknown as PublicClient

    const result = await checkBalance(
      mockPublicClient,
      mockAddress,
      100n
    )

    if (!result.error) throw new Error('Expected error to be defined')
    expect(result.error.message).toContain('RPC Error')
    expect(result.data).toBeUndefined()
  })
})