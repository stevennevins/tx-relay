import {
  TransactionHooks,
  TransactionRequest,
  TransactionReceipt,
  Hash,
  RelayError,
} from '../types'

/**
 * Manages lifecycle hooks for transaction processing
 * Provides hooks for various stages of transaction execution including:
 * - Before transaction broadcast
 * - After transaction broadcast
 * - On transaction confirmation
 * - After transaction completion
 * - On error
 */
export class HooksManager {
  /**
   * Creates a new HooksManager instance
   * @param hooks - Optional transaction lifecycle hooks
   */
  constructor(private hooks?: TransactionHooks) { }

  /**
   * Executes the beforeTransaction hook if defined
   * Called before a transaction is broadcasted to the network
   * @param tx - The transaction request that will be sent
   */
  async runBeforeTransaction(tx: TransactionRequest): Promise<void> {
    if (this.hooks?.beforeTransaction) {
      await this.hooks.beforeTransaction(tx)
    }
  }

  /**
   * Executes the afterTransaction hook if defined
   * Called after a transaction is confirmed and all processing is complete
   * @param receipt - The transaction receipt from the confirmed transaction
   */
  async runAfterTransaction(receipt: TransactionReceipt): Promise<void> {
    if (this.hooks?.afterTransaction) {
      await this.hooks.afterTransaction(receipt)
    }
  }

  /**
   * Executes the onTransactionBroadcast hook if defined
   * Called immediately after a transaction is successfully broadcasted to the network
   * @param hash - The transaction hash of the broadcasted transaction
   */
  async runOnTransactionBroadcast(hash: Hash): Promise<void> {
    if (this.hooks?.onTransactionBroadcast) {
      await this.hooks.onTransactionBroadcast(hash)
    }
  }

  /**
   * Executes the onTransactionConfirmed hook if defined
   * Called when a transaction is confirmed on the network
   * @param receipt - The transaction receipt from the confirmed transaction
   */
  async runOnTransactionConfirmed(receipt: TransactionReceipt): Promise<void> {
    if (this.hooks?.onTransactionConfirmed) {
      await this.hooks.onTransactionConfirmed(receipt)
    }
  }

  /**
   * Executes the onError hook if defined
   * Called when an error occurs during transaction processing
   * @param error - The error that occurred during transaction processing
   */
  async runOnError(error: RelayError): Promise<void> {
    if (this.hooks?.onError) {
      await this.hooks.onError(error)
    }
  }
}