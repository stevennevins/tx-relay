import { Mutex } from 'async-mutex'
import { PublicClient, Address } from 'viem'

/**
 * Manages transaction nonces for an account
 * Provides thread-safe nonce management with automatic incrementing and resetting capabilities
 * Uses a mutex to prevent race conditions when multiple transactions are being processed
 */
export class NonceManager {
  private mutex = new Mutex()
  private currentNonce: number | null = null

  /**
   * Creates a new NonceManager instance
   * @param publicClient - The viem public client used to fetch the current nonce
   * @param address - The address to manage nonces for
   */
  constructor(
    private readonly publicClient: PublicClient,
    private readonly address: Address
  ) { }

  /**
   * Gets the next available nonce for the account
   * If no nonce is currently tracked, fetches it from the network
   * Otherwise, increments the last used nonce
   * Thread-safe through mutex locking
   * @returns The next available nonce
   */
  async getNextNonce(): Promise<number> {
    return this.mutex.runExclusive(async () => {
      if (this.currentNonce === null) {
        this.currentNonce = await this.publicClient.getTransactionCount({
          address: this.address,
        })
      } else {
        this.currentNonce++
      }
      return this.currentNonce
    })
  }

  /**
   * Resets the nonce tracking
   * Forces the next getNextNonce call to fetch the current nonce from the network
   * Useful when transactions fail or when nonce might be out of sync
   */
  async reset(): Promise<void> {
    await this.mutex.runExclusive(() => {
      this.currentNonce = null
    })
  }
}