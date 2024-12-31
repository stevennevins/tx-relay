import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NonceManager } from './NonceManager'
import { type PublicClient, type Address } from 'viem'

describe('NonceManager', () => {
  let nonceManager: NonceManager
  let mockPublicClient: PublicClient
  const mockAddress = '0x123' as Address

  beforeEach(() => {
    mockPublicClient = {
      getTransactionCount: vi.fn(),
    } as unknown as PublicClient

    nonceManager = new NonceManager(mockPublicClient, mockAddress)
  })

  it('should fetch initial nonce from the blockchain', async () => {
    vi.mocked(mockPublicClient.getTransactionCount).mockResolvedValueOnce(5)

    const nonce = await nonceManager.getNextNonce()
    expect(nonce).toBe(5)
    expect(mockPublicClient.getTransactionCount).toHaveBeenCalledWith({
      address: mockAddress,
    })
  })

  it('should increment nonce for subsequent calls', async () => {
    vi.mocked(mockPublicClient.getTransactionCount).mockResolvedValueOnce(5)

    const firstNonce = await nonceManager.getNextNonce()
    const secondNonce = await nonceManager.getNextNonce()
    const thirdNonce = await nonceManager.getNextNonce()

    expect(firstNonce).toBe(5)
    expect(secondNonce).toBe(6)
    expect(thirdNonce).toBe(7)
    expect(mockPublicClient.getTransactionCount).toHaveBeenCalledTimes(1)
  })

  it('should reset nonce state', async () => {
    vi.mocked(mockPublicClient.getTransactionCount).mockResolvedValueOnce(5)
    vi.mocked(mockPublicClient.getTransactionCount).mockResolvedValueOnce(7)

    const firstNonce = await nonceManager.getNextNonce()
    expect(firstNonce).toBe(5)

    await nonceManager.reset()

    const newNonce = await nonceManager.getNextNonce()
    expect(newNonce).toBe(7)
    expect(mockPublicClient.getTransactionCount).toHaveBeenCalledTimes(2)
  })

  it('should handle concurrent nonce requests', async () => {
    vi.mocked(mockPublicClient.getTransactionCount).mockResolvedValueOnce(5)

    const results = await Promise.all([
      nonceManager.getNextNonce(),
      nonceManager.getNextNonce(),
      nonceManager.getNextNonce(),
    ])

    expect(results).toEqual([5, 6, 7])
    expect(mockPublicClient.getTransactionCount).toHaveBeenCalledTimes(1)
  })
})