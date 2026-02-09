import { expect } from 'chai'
import { Contract, ContractFactory } from 'ethers'
import { deployments, ethers } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import {
    Token6022,
    Token6022__factory,
    Token6022BridgeToken,
    Token6022BridgeToken__factory,
    Token6022BridgeAdapter,
    Token6022BridgeAdapter__factory,
} from '../../typechain-types'

describe('WhenSendingTokenViaCcip for Token6022BridgeAdapter', function () {
    const ccipSourceSelector = 16015286601757825753n
    const ccipDestinationSelector = 14767482510784806043n

    let tokenFactory: Token6022__factory
    let oftFactory: Token6022BridgeToken__factory
    let adapterFactory: Token6022BridgeAdapter__factory
    let endpointFactory: ContractFactory

    let ownerA: SignerWithAddress
    let ownerB: SignerWithAddress
    let endpointOwner: SignerWithAddress

    let canonicalToken: Token6022
    let canonicalAdapter: Token6022BridgeAdapter
    let satelliteToken: Token6022BridgeToken

    let endpointA: Contract
    let endpointB: Contract
    let ccipRouter: Contract

    before(async function () {
        tokenFactory = (await ethers.getContractFactory('Token6022')) as unknown as Token6022__factory
        oftFactory = (await ethers.getContractFactory('Token6022BridgeToken')) as unknown as Token6022BridgeToken__factory
        adapterFactory = (await ethers.getContractFactory('Token6022BridgeAdapter')) as unknown as Token6022BridgeAdapter__factory

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

        canonicalToken = await tokenFactory.connect(ownerA).deploy(ownerA.address, ethers.utils.parseEther('100'))

        canonicalAdapter = await adapterFactory.connect(ownerA).deploy(
            canonicalToken.address,
            endpointA.address,
            ccipRouter.address,
            ownerA.address
        )

        satelliteToken = await oftFactory.connect(ownerB).deploy(
            endpointB.address,
            ccipRouter.address,
            ownerB.address
        )

        await canonicalAdapter.connect(ownerA).setCcipPeer(ccipDestinationSelector, satelliteToken.address)
        await satelliteToken.connect(ownerB).setCcipPeer(ccipSourceSelector, canonicalAdapter.address)
    })

    it('should lock canonical tokens and mint satellite tokens', async function () {
        const amount = ethers.utils.parseEther('5')
        const transferId = ethers.utils.hexlify(ethers.utils.randomBytes(32))

        expect(
            await canonicalAdapter.quoteCcipSend(
                ccipDestinationSelector,
                ownerB.address,
                amount,
                transferId
            )
        ).to.equal(1)

        await canonicalToken.connect(ownerA).approve(canonicalAdapter.address, amount)

        await canonicalAdapter
            .connect(ownerA)
            .sendWithCcip(ccipDestinationSelector, ownerB.address, amount, transferId, { value: 1 })

        expect(await canonicalToken.balanceOf(ownerA.address)).to.equal(ethers.utils.parseEther('95'))
        expect(await canonicalToken.balanceOf(canonicalAdapter.address)).to.equal(amount)
        expect(await satelliteToken.balanceOf(ownerB.address)).to.equal(amount)
    })
})
