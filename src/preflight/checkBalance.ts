import { PublicClient } from 'viem'
import { RelayResult } from '../types'
import { classifyError } from '../utils/errors'

export async function checkBalance(
  publicClient: PublicClient,
  address: `0x${string}`,
  requiredAmount: bigint,
  minBalanceRequired?: bigint
): Promise<RelayResult<void>> {
  try {
    const balance = await publicClient.getBalance({ address })
    const minRequired = minBalanceRequired ?? requiredAmount

    if (balance < minRequired) {
      return {
        error: classifyError(
          `Insufficient balance. Required: ${minRequired}, Available: ${balance}`
        ),
      }
    }
    return { data: undefined }
  } catch (error) {
    return { error: classifyError(error) }
  }
}