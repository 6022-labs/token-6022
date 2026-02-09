export interface LzPointHardhat {
    network: string
    eid: number
    contractName?: string
    address?: string
}

export interface LzOmniContractHardhat {
    contract: LzPointHardhat
}

export interface LzConnectionHardhat {
    from: LzPointHardhat
    to: LzPointHardhat
    fromOptions?: string
}

export interface LzOmniGraphHardhat {
    contracts: LzOmniContractHardhat[]
    connections: LzConnectionHardhat[]
}

/**
 * Similar to LayerZero's TwoWayConfig concept:
 * - entry[0] => point A
 * - entry[1] => point B
 * - entry[2][0] => options used when A sends to B
 * - entry[2][1] => options used when B sends to A
 */
export type LzTwoWayConfig = [
    LzPointHardhat,
    LzPointHardhat,
    [string | undefined, string | undefined]?
]

export function generateLzConnectionsConfig(pathways: LzTwoWayConfig[]): LzConnectionHardhat[] {
    return pathways.flatMap(([pointA, pointB, options]) => {
        const [aToBOptions, bToAOptions] = options ?? []

        return [
            {
                from: pointA,
                to: pointB,
                fromOptions: aToBOptions,
            },
            {
                from: pointB,
                to: pointA,
                fromOptions: bToAOptions,
            },
        ]
    })
}
