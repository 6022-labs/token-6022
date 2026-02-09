import 'hardhat/types/config'

interface BridgeCoreConfig {
    type: 'canonical' | 'satellite'
    tokenAddress?: string
    tokenName?: string
    tokenSymbol?: string
}

interface BridgeAdaptersConfig {
    lz?: {
        endpoint?: string
    }
    ccip?: {
        router?: string
    }
}

declare module 'hardhat/types/config' {
    interface HardhatNetworkUserConfig {
        ccipChainSelector?: never
        bridgeCore?: never
        bridgeAdapters?: never
    }

    interface HardhatNetworkConfig {
        ccipChainSelector?: never
        bridgeCore?: never
        bridgeAdapters?: never
    }

    interface HttpNetworkUserConfig {
        ccipChainSelector?: string | bigint
        bridgeCore?: BridgeCoreConfig
        bridgeAdapters?: BridgeAdaptersConfig
    }

    interface HttpNetworkConfig {
        ccipChainSelector?: string | bigint
        bridgeCore?: BridgeCoreConfig
        bridgeAdapters?: BridgeAdaptersConfig
    }
}
