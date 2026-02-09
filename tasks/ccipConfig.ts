export interface CcipPointHardhat {
    network: string
    chainSelector: bigint | string
    contractName?: string
    address?: string
}

export interface CcipOmniContractHardhat {
    contract: CcipPointHardhat
}

export interface CcipConnectionHardhat {
    from: CcipPointHardhat
    to: CcipPointHardhat
    /** Extra args to set on `from` for traffic to `to` */
    fromExtraArgs?: string
}

export interface CcipOmniGraphHardhat {
    contracts: CcipOmniContractHardhat[]
    connections: CcipConnectionHardhat[]
}

/**
 * Similar to LayerZero's TwoWayConfig concept:
 * - entry[0] => point A
 * - entry[1] => point B
 * - entry[2][0] => extraArgs used when A sends to B
 * - entry[2][1] => extraArgs used when B sends to A
 */
export type CcipTwoWayConfig = [
    CcipPointHardhat,
    CcipPointHardhat,
    [string | undefined, string | undefined]?
]

export function generateCcipConnectionsConfig(pathways: CcipTwoWayConfig[]): CcipConnectionHardhat[] {
    return pathways.flatMap(([pointA, pointB, extraArgs]) => {
        const [aToBExtraArgs, bToAExtraArgs] = extraArgs ?? []

        return [
            {
                from: pointA,
                to: pointB,
                fromExtraArgs: aToBExtraArgs,
            },
            {
                from: pointB,
                to: pointA,
                fromExtraArgs: bToAExtraArgs,
            },
        ]
    })
}

export function normalizeChainSelector(value: bigint | string): string {
    if (typeof value === 'bigint') return value.toString()

    const trimmed = value.trim()
    if (!/^\d+$/.test(trimmed)) {
        throw new Error(`Invalid chain selector \"${value}\". Expected an unsigned integer string.`)
    }

    return BigInt(trimmed).toString()
}
