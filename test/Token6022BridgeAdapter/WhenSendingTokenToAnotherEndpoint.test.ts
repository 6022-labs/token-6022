import { expect } from 'chai'
import { deployments, ethers } from 'hardhat'
import { Contract, ContractFactory } from 'ethers'
import { Options } from '@layerzerolabs/lz-v2-utilities'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { Token6022BridgeAdapter, Token6022BridgeAdapter__factory, Token6022, Token6022__factory } from '../../typechain-types'

describe('WhenSendingTokenToAnotherEndpoint', function () {
    // Constant representing a mock Endpoint ID for testing purposes
    const eidA = 1
    const eidB = 2

    let LayerZeroOFTAdapter: Token6022BridgeAdapter__factory
    let Token6022: Token6022__factory
    let EndpointV2Mock: ContractFactory

    let _ownerA: SignerWithAddress
    let _ownerB: SignerWithAddress
    let _endpointOwner: SignerWithAddress

    let _token6022EndpointA: Token6022
    let _token6022EndpointB: Token6022

    let _layerZeroOFTAdapterEndpointA: Token6022BridgeAdapter
    let _layerZeroOFTAdapterEndpointB: Token6022BridgeAdapter

    let _mockEndpointV2A: Contract
    let _mockEndpointV2B: Contract
    let _ccipRouter: Contract

    before(async function () {
        Token6022 = (await ethers.getContractFactory('Token6022')) as unknown as Token6022__factory
        LayerZeroOFTAdapter = (await ethers.getContractFactory(
            'Token6022BridgeAdapter'
        )) as unknown as Token6022BridgeAdapter__factory

        // Fetching the first three signers (accounts) from Hardhat's local Ethereum network
        const signers = await ethers.getSigners()

        ;[_ownerA, _ownerB, _endpointOwner] = signers

        // The EndpointV2Mock contract comes from @layerzerolabs/test-devtools-evm-hardhat package
        // and its artifacts are connected as external artifacts to this project
        //
        // Unfortunately, hardhat itself does not yet provide a way of connecting external artifacts,
        // so we rely on hardhat-deploy to create a ContractFactory for EndpointV2Mock
        //
        // See https://github.com/NomicFoundation/hardhat/issues/1040
        const EndpointV2MockArtifact = await deployments.getArtifact('EndpointV2Mock')
        EndpointV2Mock = new ContractFactory(
            EndpointV2MockArtifact.abi,
            EndpointV2MockArtifact.bytecode,
            _endpointOwner
        )
    })

    // beforeEach hook for setup that runs before each test in the block
    beforeEach(async function () {
        // Deploying a mock LZEndpoint with the given Endpoint ID
        _mockEndpointV2A = await EndpointV2Mock.deploy(eidA)
        _mockEndpointV2B = await EndpointV2Mock.deploy(eidB)
        const ccipRouterFactory = await ethers.getContractFactory('CCIPRouterMock')
        _ccipRouter = await ccipRouterFactory.deploy(16015286601757825753n)

        _token6022EndpointA = await Token6022.deploy(_ownerA.address, ethers.utils.parseEther('100'))
        _token6022EndpointB = await Token6022.deploy(_ownerB.address, ethers.utils.parseEther('100'))

        // Deploying two instances of MyOFT contract with different identifiers and linking them to the mock LZEndpoint
        _layerZeroOFTAdapterEndpointA = await LayerZeroOFTAdapter.deploy(
            _token6022EndpointA.address,
            _mockEndpointV2A.address,
            _ccipRouter.address,
            _ownerA.address
        )
        _layerZeroOFTAdapterEndpointB = await LayerZeroOFTAdapter.deploy(
            _token6022EndpointB.address,
            _mockEndpointV2B.address,
            _ccipRouter.address,
            _ownerB.address
        )

        // Setting destination endpoints in the LZEndpoint mock for each MyOFT instance
        await _mockEndpointV2A.setDestLzEndpoint(_layerZeroOFTAdapterEndpointB.address, _mockEndpointV2B.address)
        await _mockEndpointV2B.setDestLzEndpoint(_layerZeroOFTAdapterEndpointA.address, _mockEndpointV2A.address)

        // Setting each MyOFT instance as a peer of the other in the mock LZEndpoint
        await _layerZeroOFTAdapterEndpointA
            .connect(_ownerA)
            .setPeer(eidB, ethers.utils.zeroPad(_layerZeroOFTAdapterEndpointB.address, 32))
        await _layerZeroOFTAdapterEndpointB
            .connect(_ownerB)
            .setPeer(eidA, ethers.utils.zeroPad(_layerZeroOFTAdapterEndpointA.address, 32))
    })

    // A test case to verify token transfer functionality
    it('should send a token from A address to B address via OFTAdapter/OFT', async function () {
        // Minting an initial amount of tokens to ownerA's address in the myOFTA contract
        const initialAmount = ethers.utils.parseEther('100')

        const tokensToSend = ethers.utils.parseEther('1')

        // Defining extra message execution options for the send operation
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

        // Send token B to the LayerZeroOFTAdapterEndpointB contract (which is the destination)
        const tokenBSupply = await _token6022EndpointB.totalSupply()
        await _token6022EndpointB.connect(_ownerB).transfer(_layerZeroOFTAdapterEndpointB.address, tokenBSupply)

        // Fetching the native fee for the token send operation
        const [nativeFee] = await _layerZeroOFTAdapterEndpointA.quoteSend(sendParam, false)

        // Approving the LayerZeroOFTAdapterEndpointA contract to spend the specified amount of tokens
        await _token6022EndpointA.connect(_ownerA).approve(_layerZeroOFTAdapterEndpointA.address, tokensToSend)

        // Executing the send operation from myOFTA contract
        await _layerZeroOFTAdapterEndpointA.send(sendParam, [nativeFee, 0], _ownerA.address, { value: nativeFee })

        // Fetching the final token balances of ownerA and ownerB
        const finalBalanceA = await _token6022EndpointA.balanceOf(_ownerA.address)
        const finalBalanceAdapter = await _token6022EndpointA.balanceOf(_layerZeroOFTAdapterEndpointA.address)
        const finalBalanceB = await _token6022EndpointB.balanceOf(_ownerB.address)

        // Asserting that the final balances are as expected after the send operation
        expect(finalBalanceA).eql(initialAmount.sub(tokensToSend))
        expect(finalBalanceAdapter).eql(tokensToSend)
        expect(finalBalanceB).eql(tokensToSend)
    })
})
