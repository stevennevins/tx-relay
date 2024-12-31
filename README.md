# Transaction Relay

A minimal, extensible transaction relay implementation using viem, vite, and typescript.

## Features

- Modern TypeScript implementation
- Built on viem for robust Ethereum interactions
- Configurable gas strategies (Legacy and EIP-1559 support)
- Exponential backoff retry mechanism
- Transaction lifecycle hooks
- Preflight balance checks
- Nonce management with mutex locking
- Error-as-values pattern for robust error handling

## Installation

```bash
npm install tx-relayer
```

## Quick Start

```typescript
import { RelayClient } from 'tx-relayer'
import { mainnet } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

const account = privateKeyToAccount('0x...')

const relay = new RelayClient({
  rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY',
  account,
  chain: mainnet,
  preflightChecks: {
    checkBalance: true
  }
})

// Send a transaction
const result = await relay.sendTransaction({
  to: '0x...',
  value: 1000000000000000000n, // 1 ETH
  data: '0x...'
})

if (result.error) {
  console.error('Transaction failed:', result.error)
} else {
  console.log('Transaction hash:', result.data)
}
```

## Advanced Usage

### Custom Gas Strategy

```typescript
import { GasStrategy, GasParameters, RelayResult } from 'tx-relayer'

class CustomGasStrategy implements GasStrategy {
  async getGasParameters(): Promise<RelayResult<GasParameters>> {
    // Your custom gas price logic here
    return {
      data: {
        maxFeePerGas: 30000000000n,
        maxPriorityFeePerGas: 1000000000n
      }
    }
  }
}

const relay = new RelayClient({
  // ... other config
  gasStrategy: new CustomGasStrategy()
})
```

### Transaction Lifecycle Hooks

```typescript
const relay = new RelayClient({
  // ... other config
  hooks: {
    beforeTransaction: async (tx) => {
      console.log('About to send transaction:', tx)
    },
    onTransactionBroadcast: async (hash) => {
      console.log('Transaction broadcast:', hash)
    },
    onTransactionConfirmed: async (receipt) => {
      console.log('Transaction confirmed:', receipt)
    },
    onError: async (error) => {
      console.error('Transaction failed:', error)
    }
  }
})
```

### Custom Retry Strategy

```typescript
import { RetryStrategy, RelayError } from 'tx-relayer'

class CustomRetryStrategy implements RetryStrategy {
  shouldRetry(error: RelayError, attempt: number): boolean {
    // Your retry logic here
    return attempt < 3
  }

  getDelay(attempt: number): number {
    return 1000 * attempt // Linear backoff
  }
}

const relay = new RelayClient({
  // ... other config
  retryStrategy: new CustomRetryStrategy()
})
```

## API Reference

### RelayClient

The main class for interacting with the relay.

#### Constructor

```typescript
constructor(config: RelayConfig)
```

Configuration options:

- `rpcUrl`: The JSON-RPC endpoint URL
- `account`: The viem Account instance
- `chain`: The viem Chain instance
- `maxRetries?`: Maximum number of retry attempts
- `timeout?`: Transaction confirmation timeout
- `hooks?`: Transaction lifecycle hooks
- `gasStrategy?`: Custom gas price strategy
- `retryStrategy?`: Custom retry strategy
- `preflightChecks?`: Configuration for preflight checks

#### Methods

- `sendTransaction(tx: TransactionRequest): Promise<RelayResult<Hash>>`
- `estimateGas(tx: TransactionRequest): Promise<RelayResult<bigint>>`
- `waitForTransaction(hash: Hash): Promise<RelayResult<TransactionReceipt>>`

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT
