import fs from 'fs/promises'
import path from 'path'

import { Contract } from 'ethers'
import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import {
    LzConnectionHardhat,
    LzOmniGraphHardhat,
    LzPointHardhat,
} from './lzConfig'

interface LzWireArgs {
    lzConfig: string
    dryRun: boolean
}

const LZ_CONFIGURABLE_ABI = [
    'function peers(uint32 eid) view returns (bytes32 peer)',
    'function lzSendOptions(uint32 eid) view returns (bytes options)',
    'function setPeer(uint32 eid, bytes32 peer)',
    'function setLzSendOptions(uint32 eid, bytes options)',
]

async function loadLzGraph(configPath: string): Promise<LzOmniGraphHardhat> {
    const lzConfig = (await import(path.resolve('./', configPath))).default

    if (typeof lzConfig === 'function') {
        return await lzConfig()
    }

    return lzConfig
}

async function resolvePointAddress(point: LzPointHardhat, hre: HardhatRuntimeEnvironment): Promise<string> {
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
                    `Set an explicit "address" in the LZ config for this point.`
            )
        }

        throw error
    }
}

function toBytes32Address(address: string, hre: HardhatRuntimeEnvironment): string {
    return hre.ethers.utils.hexZeroPad(hre.ethers.utils.getAddress(address), 32).toLowerCase()
}

function normalizeHexBytes(value: string, hre: HardhatRuntimeEnvironment): string {
    return hre.ethers.utils.hexlify(value).toLowerCase()
}

async function configureConnection(
    connection: LzConnectionHardhat,
    hre: HardhatRuntimeEnvironment,
    contract: Contract,
    dryRun: boolean
): Promise<void> {
    const remoteAddress = await resolvePointAddress(connection.to, hre)
    const remotePeer = toBytes32Address(remoteAddress, hre)

    const currentPeer = (await contract.peers(connection.to.eid)).toLowerCase()

    if (currentPeer !== remotePeer) {
        const action = `[lz:wire] setPeer eid=${connection.to.eid} peer=${remotePeer}`

        if (dryRun) {
            console.log(`${action} (dry-run)`)
        } else {
            const tx = await contract.setPeer(connection.to.eid, remotePeer)
            await tx.wait()
            console.log(`${action} tx=${tx.hash}`)
        }
    } else {
        console.log(`[lz:wire] peer already configured eid=${connection.to.eid} peer=${remotePeer}`)
    }

    if (connection.fromOptions != null) {
        const desiredOptions = normalizeHexBytes(connection.fromOptions, hre)
        const currentOptions = normalizeHexBytes(await contract.lzSendOptions(connection.to.eid), hre)

        if (currentOptions !== desiredOptions) {
            const action = `[lz:wire] setLzSendOptions eid=${connection.to.eid} options=${desiredOptions}`

            if (dryRun) {
                console.log(`${action} (dry-run)`)
            } else {
                const tx = await contract.setLzSendOptions(connection.to.eid, desiredOptions)
                await tx.wait()
                console.log(`${action} tx=${tx.hash}`)
            }
        } else {
            console.log(`[lz:wire] options already configured eid=${connection.to.eid} options=${desiredOptions}`)
        }
    }
}

task('lz:wire', 'Configures LayerZero peers/options from a mesh config file')
    .addOptionalParam('lzConfig', 'Path to LayerZero config file', 'layerzero.testnet.config.ts', types.string)
    .addFlag('dryRun', 'Print actions without sending transactions')
    .setAction(async (args: LzWireArgs, hre: HardhatRuntimeEnvironment) => {
        const graph = await loadLzGraph(args.lzConfig)
        const localNetwork = hre.network.name

        const localConnections = graph.connections.filter((connection) => connection.from.network === localNetwork)

        if (localConnections.length === 0) {
            console.warn(`[lz:wire] no outbound connection found for network "${localNetwork}" in ${args.lzConfig}`)
            return
        }

        const signer = (await hre.ethers.getSigners())[0]

        if (signer == null) {
            throw new Error('No signer available for this network')
        }

        console.log(`[lz:wire] network=${localNetwork} connections=${localConnections.length} signer=${signer.address}`)

        for (const connection of localConnections) {
            const localAddress = await resolvePointAddress(connection.from, hre)
            const contract = await hre.ethers.getContractAt(LZ_CONFIGURABLE_ABI, localAddress, signer)

            console.log(
                `[lz:wire] local=${connection.from.contractName ?? localAddress} (${localAddress}) ` +
                    `-> remoteNetwork=${connection.to.network}`
            )

            await configureConnection(connection, hre, contract, args.dryRun)
        }
    })
