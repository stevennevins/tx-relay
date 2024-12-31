import { describe, it, expect, vi } from 'vitest'
import { HooksManager } from './HooksManager'
import { TransactionHooks, RelayError, RelayErrorCode } from '../types'
import { type TransactionReceipt, type Hash } from 'viem'

describe('HooksManager', () => {
  it('should call hooks in the correct order', async () => {
    const mockHooks: TransactionHooks = {
      beforeTransaction: vi.fn(),
      afterTransaction: vi.fn(),
      onTransactionBroadcast: vi.fn(),
      onTransactionConfirmed: vi.fn(),
      onError: vi.fn(),
    }

    const hooksManager = new HooksManager(mockHooks)
    const mockTx = { to: '0x1234567890123456789012345678901234567890' as const, value: 1000n }
    const mockHash = '0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789' as Hash
    const mockReceipt = {
      blockHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
      blockNumber: 1n,
      contractAddress: null,
      cumulativeGasUsed: 21000n,
      effectiveGasPrice: 2000000000n,
      from: '0x1234567890123456789012345678901234567890',
      gasUsed: 21000n,
      logs: [],
      logsBloom: '0x',
      status: 'success',
      to: '0x1234567890123456789012345678901234567890',
      transactionHash: mockHash,
      transactionIndex: 0,
      type: 'eip1559',
    } as const satisfies TransactionReceipt
    const mockError = new RelayError('test error', RelayErrorCode.TEMPORARY_FAILURE)

    // Test beforeTransaction
    await hooksManager.runBeforeTransaction(mockTx)
    expect(mockHooks.beforeTransaction).toHaveBeenCalledWith(mockTx)

    // Test onTransactionBroadcast
    await hooksManager.runOnTransactionBroadcast(mockHash)
    expect(mockHooks.onTransactionBroadcast).toHaveBeenCalledWith(mockHash)

    // Test onTransactionConfirmed
    await hooksManager.runOnTransactionConfirmed(mockReceipt)
    expect(mockHooks.onTransactionConfirmed).toHaveBeenCalledWith(mockReceipt)

    // Test afterTransaction
    await hooksManager.runAfterTransaction(mockReceipt)
    expect(mockHooks.afterTransaction).toHaveBeenCalledWith(mockReceipt)

    // Test onError
    await hooksManager.runOnError(mockError)
    expect(mockHooks.onError).toHaveBeenCalledWith(mockError)
  })

  it('should handle undefined hooks gracefully', async () => {
    const hooksManager = new HooksManager()
    const mockTx = { to: '0x1234567890123456789012345678901234567890' as const, value: 1000n }
    const mockHash = '0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789' as Hash
    const mockReceipt = {
      blockHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
      blockNumber: 1n,
      contractAddress: null,
      cumulativeGasUsed: 21000n,
      effectiveGasPrice: 2000000000n,
      from: '0x1234567890123456789012345678901234567890',
      gasUsed: 21000n,
      logs: [],
      logsBloom: '0x',
      status: 'success',
      to: '0x1234567890123456789012345678901234567890',
      transactionHash: mockHash,
      transactionIndex: 0,
      type: 'eip1559',
    } as const satisfies TransactionReceipt
    const mockError = new RelayError('test error', RelayErrorCode.TEMPORARY_FAILURE)

    // None of these should throw
    await expect(hooksManager.runBeforeTransaction(mockTx)).resolves.toBeUndefined()
    await expect(hooksManager.runOnTransactionBroadcast(mockHash)).resolves.toBeUndefined()
    await expect(hooksManager.runOnTransactionConfirmed(mockReceipt)).resolves.toBeUndefined()
    await expect(hooksManager.runAfterTransaction(mockReceipt)).resolves.toBeUndefined()
    await expect(hooksManager.runOnError(mockError)).resolves.toBeUndefined()
  })
})