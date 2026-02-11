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

interface BridgeGovernanceConfig {
    owner?: string
}

declare module 'hardhat/types/config' {
    interface HardhatNetworkUserConfig {
        ccipChainSelector?: never
        bridgeCore?: never
        bridgeAdapters?: never
        bridgeGovernance?: never
    }

    interface HardhatNetworkConfig {
        ccipChainSelector?: never
        bridgeCore?: never
        bridgeAdapters?: never
        bridgeGovernance?: never
    }

    interface HttpNetworkUserConfig {
        ccipChainSelector?: string | bigint
        bridgeCore?: BridgeCoreConfig
        bridgeAdapters?: BridgeAdaptersConfig
        bridgeGovernance?: BridgeGovernanceConfig
    }

    interface HttpNetworkConfig {
        ccipChainSelector?: string | bigint
        bridgeCore?: BridgeCoreConfig
        bridgeAdapters?: BridgeAdaptersConfig
        bridgeGovernance?: BridgeGovernanceConfig
    }
}
