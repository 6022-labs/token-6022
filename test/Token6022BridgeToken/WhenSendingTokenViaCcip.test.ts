import { expect } from 'chai'
import { Contract, ContractFactory } from 'ethers'
import { deployments, ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import {
    Token6022BridgeToken,
    Token6022BridgeToken__factory,
} from '../../typechain-types'

describe('WhenSendingTokenViaCcip for Token6022BridgeToken', function () {
    const ccipSourceSelector = 16015286601757825753n
    const ccipDestinationSelector = 14767482510784806043n

    let oftFactory: Token6022BridgeToken__factory
    let endpointFactory: ContractFactory

    let ownerA: SignerWithAddress
    let ownerB: SignerWithAddress
    let endpointOwner: SignerWithAddress

    let tokenA: Token6022BridgeToken
    let tokenB: Token6022BridgeToken

    let endpointA: Contract
    let endpointB: Contract
    let ccipRouter: Contract

    before(async function () {
        oftFactory = (await ethers.getContractFactory('Token6022BridgeToken')) as unknown as Token6022BridgeToken__factory

        const signers = await ethers.getSigners()
        ;[ownerA, ownerB, endpointOwner] = signers

        const endpointArtifact = await deployments.getArtifact('EndpointV2Mock')
        endpointFactory = new ContractFactory(
            endpointArtifact.abi,
            endpointArtifact.bytecode,
            endpointOwner
        )
    })

    beforeEach(async function () {
        endpointA = await endpointFactory.deploy(1)
        endpointB = await endpointFactory.deploy(2)

        const ccipRouterFactory = await ethers.getContractFactory('CCIPRouterMock')
        ccipRouter = await ccipRouterFactory.deploy(ccipSourceSelector)
        await ccipRouter.setChainSupported(ccipSourceSelector, true)
        await ccipRouter.setChainSupported(ccipDestinationSelector, true)

        tokenA = await oftFactory.connect(ownerA).deploy(endpointA.address, ccipRouter.address, ownerA.address)
        tokenB = await oftFactory.connect(ownerB).deploy(endpointB.address, ccipRouter.address, ownerB.address)

        await tokenA.connect(ownerA).setCcipPeer(ccipSourceSelector, tokenB.address)
        await tokenA.connect(ownerA).setCcipPeer(ccipDestinationSelector, tokenB.address)
        await tokenB.connect(ownerB).setCcipPeer(ccipSourceSelector, tokenA.address)

        const seedAmount = ethers.utils.parseEther('10')
        const seedPayload = ethers.utils.defaultAbiCoder.encode(
            ['bytes32', 'address', 'uint256'],
            [ethers.utils.hexlify(ethers.utils.randomBytes(32)), ownerA.address, seedAmount]
        )

        await ccipRouter.route(tokenA.address, {
            messageId: ethers.utils.hexlify(ethers.utils.randomBytes(32)),
            sourceChainSelector: ccipSourceSelector,
            sender: ethers.utils.defaultAbiCoder.encode(['address'], [tokenB.address]),
            data: seedPayload,
            destTokenAmounts: [],
        })
    })

    it('should burn on source and mint on destination', async function () {
        const amount = ethers.utils.parseEther('4')
        const transferId = ethers.utils.hexlify(ethers.utils.randomBytes(32))

        await tokenA
            .connect(ownerA)
            .sendWithCcip(ccipDestinationSelector, ownerB.address, amount, transferId, { value: 1 })

        expect(await tokenA.balanceOf(ownerA.address)).to.equal(ethers.utils.parseEther('6'))
        expect(await tokenB.balanceOf(ownerB.address)).to.equal(amount)
    })
})
