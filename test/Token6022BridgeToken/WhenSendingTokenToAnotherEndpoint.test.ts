import { expect } from 'chai'
import { BigNumber, Contract, ContractFactory } from 'ethers'
import { deployments, ethers } from 'hardhat'
import { Options } from '@layerzerolabs/lz-v2-utilities'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Token6022BridgeToken, Token6022BridgeToken__factory } from '../../typechain-types'

describe('WhenSendingTokenToAnotherEndpoint for Token6022BridgeToken', function () {
    const eidA = 1
    const eidB = 2

    let Token6022BridgeTokenFactory: Token6022BridgeToken__factory
    let EndpointV2Mock: ContractFactory

    let _ownerA: SignerWithAddress
    let _ownerB: SignerWithAddress
    let _endpointOwner: SignerWithAddress

    let _token6022OftEndpointA: Token6022BridgeToken
    let _token6022OftEndpointB: Token6022BridgeToken

    let _mockEndpointV2A: Contract
    let _mockEndpointV2B: Contract
    let _ccipRouter: Contract

    before(async function () {
        Token6022BridgeTokenFactory = (await ethers.getContractFactory('Token6022BridgeToken')) as unknown as Token6022BridgeToken__factory

        const signers = await ethers.getSigners()
        ;[_ownerA, _ownerB, _endpointOwner] = signers

        const endpointArtifact = await deployments.getArtifact('EndpointV2Mock')
        EndpointV2Mock = new ContractFactory(
            endpointArtifact.abi,
            endpointArtifact.bytecode,
            _endpointOwner
        )
    })

    beforeEach(async function () {
        _mockEndpointV2A = await EndpointV2Mock.deploy(eidA)
        _mockEndpointV2B = await EndpointV2Mock.deploy(eidB)
        const ccipRouterFactory = await ethers.getContractFactory('CCIPRouterMock')
        _ccipRouter = await ccipRouterFactory.deploy(16015286601757825753n)
        await _ccipRouter.deployed()

        _token6022OftEndpointA = await Token6022BridgeTokenFactory.connect(_ownerA).deploy(
            _mockEndpointV2A.address,
            _ccipRouter.address,
            _ownerA.address
        )
        await _token6022OftEndpointA.deployed()

        _token6022OftEndpointB = await Token6022BridgeTokenFactory.connect(_ownerB).deploy(
            _mockEndpointV2B.address,
            _ccipRouter.address,
            _ownerB.address
        )
        await _token6022OftEndpointB.deployed()

        await _mockEndpointV2A.setDestLzEndpoint(_token6022OftEndpointB.address, _mockEndpointV2B.address)
        await _mockEndpointV2B.setDestLzEndpoint(_token6022OftEndpointA.address, _mockEndpointV2A.address)

        await _token6022OftEndpointA
            .connect(_ownerA)
            .setPeer(eidB, ethers.utils.zeroPad(_token6022OftEndpointB.address, 32))
        await _token6022OftEndpointB
            .connect(_ownerB)
            .setPeer(eidA, ethers.utils.zeroPad(_token6022OftEndpointA.address, 32))
    })

    async function creditTokens(
        token: Token6022BridgeToken,
        endpoint: Contract,
        recipient: SignerWithAddress,
        amountLD: BigNumber,
        remoteEid: number,
        remotePeer: string
    ) {
        const conversionRate = await token.decimalConversionRate()
        const amountSD = amountLD.div(conversionRate)

        const recipientBytes = ethers.utils.hexZeroPad(recipient.address, 32)
        const amountBytes = ethers.utils.hexZeroPad(amountSD.toHexString(), 8)
        const payload = ethers.utils.hexConcat([recipientBytes, amountBytes])
        const payloadHash = ethers.utils.keccak256(payload)

        const origin = {
            srcEid: remoteEid,
            sender: remotePeer,
            nonce: 1,
        }

        const guid = ethers.utils.hexlify(ethers.utils.randomBytes(32))
        const executeGas = 200000

        await endpoint.receivePayload(origin, token.address, payloadHash, payload, executeGas, 0, guid)
    }

    it('should send a token from A address to B address via OFT/OFT', async function () {
        const initialAmount = ethers.utils.parseEther('100')
        const remotePeerForA = ethers.utils.hexlify(ethers.utils.zeroPad(_token6022OftEndpointB.address, 32))

        await creditTokens(
            _token6022OftEndpointA,
            _mockEndpointV2A,
            _ownerA,
            initialAmount,
            eidB,
            remotePeerForA
        )

        const tokensToSend = ethers.utils.parseEther('1')

        const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex().toString()

        const sendParam = [
            eidB,
            ethers.utils.zeroPad(_ownerB.address, 32),
            tokensToSend,
            tokensToSend,
            options,
            '0x',
            '0x',
        ]

        const [nativeFee] = await _token6022OftEndpointA.connect(_ownerA).quoteSend(sendParam, false)

        await _token6022OftEndpointA
            .connect(_ownerA)
            .send(sendParam, [nativeFee, 0], _ownerA.address, { value: nativeFee })

        const finalBalanceA = await _token6022OftEndpointA.balanceOf(_ownerA.address)
        const finalBalanceB = await _token6022OftEndpointB.balanceOf(_ownerB.address)

        expect(finalBalanceA).eql(initialAmount.sub(tokensToSend))
        expect(finalBalanceB).eql(tokensToSend)
    })
})
