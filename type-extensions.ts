import 'hardhat/types/config'

interface OftAdapterConfig {
    tokenAddress: string
}

declare module 'hardhat/types/config' {
    interface HardhatNetworkUserConfig {
        oftAdapter?: never
        ccipRouter?: never
    }

    interface HardhatNetworkConfig {
        oftAdapter?: never
        ccipRouter?: never
    }

    interface HttpNetworkUserConfig {
        oftAdapter?: OftAdapterConfig
        ccipRouter?: string
    }

    interface HttpNetworkConfig {
        oftAdapter?: OftAdapterConfig
        ccipRouter?: string
    }
}
