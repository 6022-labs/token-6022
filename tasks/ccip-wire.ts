import fs from 'fs/promises'
import path from 'path'

import { Contract } from 'ethers'
import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import {
    CcipConnectionHardhat,
    CcipOmniGraphHardhat,
    CcipPointHardhat,
    normalizeChainSelector,
} from './ccip-config'

interface CcipWireArgs {
    ccipConfig: string
    dryRun: boolean
}

const CCIP_CONFIGURABLE_ABI = [
    'function ccipPeers(uint64 chainSelector) view returns (bytes peer)',
    'function ccipExtraArgs(uint64 chainSelector) view returns (bytes extraArgs)',
    'function setCcipPeer(uint64 chainSelector, bytes peer)',
    'function setCcipExtraArgs(uint64 chainSelector, bytes extraArgs)',
]

async function loadCcipGraph(configPath: string): Promise<CcipOmniGraphHardhat> {
    const ccipConfig = (await import(path.resolve('./', configPath))).default

    if (typeof ccipConfig === 'function') {
        return await ccipConfig()
    }

    return ccipConfig
}

async function resolvePointAddress(point: CcipPointHardhat, hre: HardhatRuntimeEnvironment): Promise<string> {
    if (point.address != null) {
        return hre.ethers.utils.getAddress(point.address)
    }

    if (point.contractName == null) {
        throw new Error(`Point on network "${point.network}" must define either "address" or "contractName"`)
    }

    if (point.network === hre.network.name) {
        const deployment = await hre.deployments.get(point.contractName)

        return hre.ethers.utils.getAddress(deployment.address)
    }

    const deploymentPath = path.join(hre.config.paths.deployments, point.network, `${point.contractName}.json`)

    try {
        const content = await fs.readFile(deploymentPath, 'utf8')
        const parsed = JSON.parse(content) as { address?: string }

        if (parsed.address == null) {
            throw new Error(`No address found in ${deploymentPath}`)
        }

        return hre.ethers.utils.getAddress(parsed.address)
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            throw new Error(
                `Could not resolve ${point.contractName} on "${point.network}". ` +
                    `Missing deployment file: ${deploymentPath}. ` +
                    `Set an explicit "address" in the CCIP config for this point.`
            )
        }

        throw error
    }
}

function normalizeHexBytes(value: string, hre: HardhatRuntimeEnvironment): string {
    return hre.ethers.utils.hexlify(value).toLowerCase()
}

function encodeEvmCcipPeer(address: string, hre: HardhatRuntimeEnvironment): string {
    return hre.ethers.utils.defaultAbiCoder.encode(['address'], [hre.ethers.utils.getAddress(address)])
}

async function configureConnection(
    connection: CcipConnectionHardhat,
    hre: HardhatRuntimeEnvironment,
    contract: Contract,
    dryRun: boolean
): Promise<void> {
    const destinationChainSelector = normalizeChainSelector(connection.to.chainSelector)
    const destinationChainSelectorBigInt = BigInt(destinationChainSelector)

    if (destinationChainSelectorBigInt > (2n ** 64n - 1n)) {
        throw new Error(`Chain selector ${destinationChainSelector} exceeds uint64 range`)
    }

    const remotePeer = encodeEvmCcipPeer(await resolvePointAddress(connection.to, hre), hre)
    const currentPeer = await contract.ccipPeers(destinationChainSelector)

    if (normalizeHexBytes(currentPeer, hre) !== normalizeHexBytes(remotePeer, hre)) {
        const action = `[ccip:wire] setCcipPeer selector=${destinationChainSelector} peer=${remotePeer}`

        if (dryRun) {
            console.log(`${action} (dry-run)`)
        } else {
            const tx = await contract.setCcipPeer(destinationChainSelector, remotePeer)
            await tx.wait()
            console.log(`${action} tx=${tx.hash}`)
        }
    } else {
        console.log(
            `[ccip:wire] peer already configured selector=${destinationChainSelector} peer=${remotePeer}`
        )
    }

    if (connection.fromExtraArgs != null) {
        const desiredExtraArgs = normalizeHexBytes(connection.fromExtraArgs, hre)
        const currentExtraArgs = normalizeHexBytes(await contract.ccipExtraArgs(destinationChainSelector), hre)

        if (currentExtraArgs !== desiredExtraArgs) {
            const action = `[ccip:wire] setCcipExtraArgs selector=${destinationChainSelector} extraArgs=${desiredExtraArgs}`

            if (dryRun) {
                console.log(`${action} (dry-run)`)
            } else {
                const tx = await contract.setCcipExtraArgs(destinationChainSelector, desiredExtraArgs)
                await tx.wait()
                console.log(`${action} tx=${tx.hash}`)
            }
        } else {
            console.log(
                `[ccip:wire] extraArgs already configured selector=${destinationChainSelector} extraArgs=${desiredExtraArgs}`
            )
        }
    }
}

task('ccip:wire', 'Configures CCIP peers/extraArgs from a mesh config file')
    .addOptionalParam('ccipConfig', 'Path to CCIP config file', 'ccip.testnet.config.ts', types.string)
    .addFlag('dryRun', 'Print actions without sending transactions')
    .setAction(async (args: CcipWireArgs, hre: HardhatRuntimeEnvironment) => {
        const graph = await loadCcipGraph(args.ccipConfig)
        const localNetwork = hre.network.name

        const localConnections = graph.connections.filter((connection) => connection.from.network === localNetwork)

        if (localConnections.length === 0) {
            console.warn(
                `[ccip:wire] no outbound CCIP connection found for network "${localNetwork}" in ${args.ccipConfig}`
            )
            return
        }

        const signer = (await hre.ethers.getSigners())[0]

        if (signer == null) {
            throw new Error('No signer available for this network')
        }

        console.log(
            `[ccip:wire] network=${localNetwork} connections=${localConnections.length} signer=${signer.address}`
        )

        for (const connection of localConnections) {
            const localAddress = await resolvePointAddress(connection.from, hre)
            const contract = await hre.ethers.getContractAt(CCIP_CONFIGURABLE_ABI, localAddress, signer)

            console.log(
                `[ccip:wire] local=${connection.from.contractName ?? localAddress} (${localAddress}) ` +
                    `-> remoteNetwork=${connection.to.network}`
            )

            await configureConnection(connection, hre, contract, args.dryRun)
        }
    })
