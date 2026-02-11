import { BigNumber, Contract, ContractReceipt } from 'ethers'
import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

interface BridgeSendCommonArgs {
    adapter: string
    to: string
    amount: string
    transferId?: string
}

interface LzSendArgs extends BridgeSendCommonArgs {
    dstEid: number
    options: string
}

interface CcipSendArgs extends BridgeSendCommonArgs {
    dstChainSelector: string
}

async function resolveAdapterAddress(adapter: string, hre: HardhatRuntimeEnvironment): Promise<string> {
    if (hre.ethers.utils.isAddress(adapter)) {
        return hre.ethers.utils.getAddress(adapter)
    }

    const deployment = await hre.deployments.getOrNull(adapter)
    if (deployment == null) {
        throw new Error(`Could not resolve adapter "${adapter}" as an address or deployment name`)
    }

    return hre.ethers.utils.getAddress(deployment.address)
}

function resolveTransferId(transferId: string | undefined, hre: HardhatRuntimeEnvironment): string {
    if (transferId == null || transferId === '') {
        return hre.ethers.utils.hexlify(hre.ethers.utils.randomBytes(32))
    }

    const normalized = hre.ethers.utils.hexlify(transferId)
    const length = hre.ethers.utils.hexDataLength(normalized)
    if (length > 32) {
        throw new Error(`transferId must be at most 32 bytes, received ${length} bytes`)
    }

    return hre.ethers.utils.hexZeroPad(normalized, 32)
}

async function resolveAmountAndApproveIfNeeded(
    coreAddress: string,
    amount: string,
    signerAddress: string,
    hre: HardhatRuntimeEnvironment
): Promise<{ amountLD: BigNumber; decimals: number; canonicalToken?: string }> {
    const signer = (await hre.ethers.getSigners())[0]
    if (signer == null) {
        throw new Error('No signer available for this network')
    }

    const canonicalCore = new Contract(coreAddress, ['function token() view returns (address)'], signer)

    let decimalsSourceAddress = coreAddress
    let canonicalToken: string | undefined

    try {
        canonicalToken = hre.ethers.utils.getAddress(await canonicalCore.token())
        decimalsSourceAddress = canonicalToken
    } catch {
        canonicalToken = undefined
    }

    const asset = new Contract(
        decimalsSourceAddress,
        [
            'function decimals() view returns (uint8)',
            'function allowance(address owner, address spender) view returns (uint256)',
            'function approve(address spender, uint256 value) returns (bool)',
        ],
        signer
    )

    const decimals = Number(await asset.decimals())
    const amountLD = hre.ethers.utils.parseUnits(amount, decimals)

    if (canonicalToken != null) {
        const allowance: BigNumber = await asset.allowance(signerAddress, coreAddress)
        if (allowance.lt(amountLD)) {
            const approvalTx = await asset.approve(coreAddress, amountLD)
            await approvalTx.wait()
            console.log(`[bridge:send] approved canonical token ${canonicalToken} for core ${coreAddress} tx=${approvalTx.hash}`)
        }
    }

    return { amountLD, decimals, canonicalToken }
}

function findEventArg(receipt: ContractReceipt, eventName: string, argName: string): string | undefined {
    const event = receipt.events?.find((candidate) => candidate.event === eventName)
    const args = event?.args as Record<string, unknown> | undefined
    const value = args?.[argName]
    return typeof value === 'string' ? value : undefined
}

task('lz:send', 'Sends a bridge transfer through Token6022BridgeAdapterLZ')
    .addParam('dstEid', 'Destination LayerZero endpoint id', undefined, types.int)
    .addParam('to', 'Recipient address on destination chain', undefined, types.string)
    .addParam('amount', 'Token amount in human units', undefined, types.string)
    .addOptionalParam('adapter', 'Adapter deployment name or address', 'Token6022BridgeAdapterLZ', types.string)
    .addOptionalParam('options', 'LayerZero options as hex bytes (0x uses stored defaults)', '0x', types.string)
    .addOptionalParam('transferId', 'Custom transfer id (bytes32 or shorter hex)', undefined, types.string)
    .setAction(async (args: LzSendArgs, hre: HardhatRuntimeEnvironment) => {
        const signer = (await hre.ethers.getSigners())[0]
        if (signer == null) {
            throw new Error('No signer available for this network')
        }

        const adapterAddress = await resolveAdapterAddress(args.adapter, hre)
        const adapter = await hre.ethers.getContractAt('Token6022BridgeAdapterLZ', adapterAddress, signer)
        const coreAddress = hre.ethers.utils.getAddress(await adapter.core())
        const transferId = resolveTransferId(args.transferId, hre)

        const { amountLD, decimals, canonicalToken } = await resolveAmountAndApproveIfNeeded(
            coreAddress,
            args.amount,
            signer.address,
            hre
        )

        const quotedFee = await adapter.quoteLzSend(args.dstEid, args.to, amountLD, transferId, args.options, false)
        const nativeFee: BigNumber = quotedFee.nativeFee ?? quotedFee[0]

        console.log(
            `[lz:send] network=${hre.network.name} adapter=${adapterAddress} core=${coreAddress} ` +
                `dstEid=${args.dstEid} to=${args.to} amount=${args.amount} decimals=${decimals} ` +
                `transferId=${transferId} nativeFee=${nativeFee.toString()}`
        )
        if (canonicalToken != null) {
            console.log(`[lz:send] source core type=canonical token=${canonicalToken}`)
        } else {
            console.log('[lz:send] source core type=satellite')
        }

        const tx = await adapter.sendWithLz(args.dstEid, args.to, amountLD, transferId, args.options, {
            value: nativeFee,
        })
        const receipt = await tx.wait()
        const guid = findEventArg(receipt, 'LzSend', 'guid')

        console.log(`[lz:send] tx=${tx.hash}`)
        if (guid != null) {
            console.log(`[lz:send] guid=${guid}`)
        }
    })

task('ccip:send', 'Sends a bridge transfer through Token6022BridgeAdapterCCIP')
    .addParam('dstChainSelector', 'Destination CCIP chain selector', undefined, types.string)
    .addParam('to', 'Recipient address on destination chain', undefined, types.string)
    .addParam('amount', 'Token amount in human units', undefined, types.string)
    .addOptionalParam('adapter', 'Adapter deployment name or address', 'Token6022BridgeAdapterCCIP', types.string)
    .addOptionalParam('transferId', 'Custom transfer id (bytes32 or shorter hex)', undefined, types.string)
    .setAction(async (args: CcipSendArgs, hre: HardhatRuntimeEnvironment) => {
        const signer = (await hre.ethers.getSigners())[0]
        if (signer == null) {
            throw new Error('No signer available for this network')
        }

        const adapterAddress = await resolveAdapterAddress(args.adapter, hre)
        const adapter = await hre.ethers.getContractAt('Token6022BridgeAdapterCCIP', adapterAddress, signer)
        const coreAddress = hre.ethers.utils.getAddress(await adapter.core())
        const transferId = resolveTransferId(args.transferId, hre)

        const { amountLD, decimals, canonicalToken } = await resolveAmountAndApproveIfNeeded(
            coreAddress,
            args.amount,
            signer.address,
            hre
        )

        const quotedFee: BigNumber = await adapter.quoteCcipSend(
            args.dstChainSelector,
            args.to,
            amountLD,
            transferId
        )

        console.log(
            `[ccip:send] network=${hre.network.name} adapter=${adapterAddress} core=${coreAddress} ` +
                `dstChainSelector=${args.dstChainSelector} to=${args.to} amount=${args.amount} decimals=${decimals} ` +
                `transferId=${transferId} nativeFee=${quotedFee.toString()}`
        )
        if (canonicalToken != null) {
            console.log(`[ccip:send] source core type=canonical token=${canonicalToken}`)
        } else {
            console.log('[ccip:send] source core type=satellite')
        }

        const tx = await adapter.sendWithCcip(args.dstChainSelector, args.to, amountLD, transferId, {
            value: quotedFee,
        })
        const receipt = await tx.wait()
        const messageId = findEventArg(receipt, 'CcipSend', 'messageId')

        console.log(`[ccip:send] tx=${tx.hash}`)
        if (messageId != null) {
            console.log(`[ccip:send] messageId=${messageId}`)
        }
    })
