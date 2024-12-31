import { describe, it, expect } from 'vitest'
import { RelayClient } from '../src/RelayClient'
import { createPublicClient, http, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { foundry } from 'viem/chains'

describe('RelayClient', () => {
  // Test accounts from Anvil's default accounts
  const SENDER_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
  const RECEIVER = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'

  it('should successfully send ETH', async () => {
    // Setup relay client with Anvil's first account
    const account = privateKeyToAccount(SENDER_KEY)
    const relay = new RelayClient({
      rpcUrl: 'http://127.0.0.1:8545',
      account,
      chain: foundry,
      preflightChecks: {
        checkBalance: true
      }
    })

    // Create public client to check balances
    const publicClient = createPublicClient({
      chain: foundry,
      transport: http('http://127.0.0.1:8545')
    })

    // Get initial balance
    const initialBalance = await publicClient.getBalance({ address: RECEIVER })

    // Send 1 ETH
    const result = await relay.sendTransaction({
      to: RECEIVER,
      value: parseEther('1.0')
    })

    // Verify transaction succeeded
    expect(result.error).toBeUndefined()
    expect(result.data).toBeDefined()

    // Verify balance changed
    const finalBalance = await publicClient.getBalance({ address: RECEIVER })
    expect(finalBalance - initialBalance).toBe(parseEther('1.0'))
  })

  it('should fail when sending more ETH than available', async () => {
    const account = privateKeyToAccount(SENDER_KEY)
    const relay = new RelayClient({
      rpcUrl: 'http://127.0.0.1:8545',
      account,
      chain: foundry,
      preflightChecks: {
        checkBalance: true
      }
    })

    // Try to send 1000000 ETH (more than available in test account)
    const result = await relay.sendTransaction({
      to: RECEIVER,
      value: parseEther('1000000.0')
    })

    // Verify transaction failed with insufficient balance
    expect(result.error).toBeDefined()
    expect(result.error?.message).toMatch(/The total cost \(gas \* gas fee \+ value\) of executing this transaction exceeds the balance of the account/i)
  })
})