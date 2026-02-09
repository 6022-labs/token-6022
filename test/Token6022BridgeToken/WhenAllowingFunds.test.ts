import { expect } from 'chai'
import { ContractFactory } from 'ethers'
import { deployments, ethers } from 'hardhat'
import { Token6022BridgeToken } from '../../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { reset, loadFixture } from '@nomicfoundation/hardhat-network-helpers'

describe('When allowing funds of Token6022BridgeToken', function () {
    let _token6022Oft: Token6022BridgeToken

    let _owner: SignerWithAddress
    let _otherAccount: SignerWithAddress

    async function deployToken() {
        await reset()

        const [owner, otherAccount, endpointOwner] = await ethers.getSigners()

        const endpointArtifact = await deployments.getArtifact('EndpointV2Mock')
        const endpointFactory = new ContractFactory(
            endpointArtifact.abi,
            endpointArtifact.bytecode,
            endpointOwner
        )
        const endpoint = await endpointFactory.deploy(1)
        await endpoint.deployed()
        const ccipRouterFactory = await ethers.getContractFactory('CCIPRouterMock', owner)
        const ccipRouter = await ccipRouterFactory.deploy(16015286601757825753n)
        await ccipRouter.deployed()

        const tokenFactory = await ethers.getContractFactory('Token6022BridgeToken', owner)
        const token6022Oft = (await tokenFactory.deploy(
            endpoint.address,
            ccipRouter.address,
            owner.address
        )) as unknown as Token6022BridgeToken

        return { token6022Oft, otherAccount, owner }
    }

    beforeEach(async function () {
        const fixture = await loadFixture(deployToken)
        _owner = fixture.owner
        _token6022Oft = fixture.token6022Oft
        _otherAccount = fixture.otherAccount
    })

    it('Should allow funds', async function () {
        // Approve 50 tokens from owner to otherAccount
        await _token6022Oft.approve(_otherAccount.address, 50)

        // Check balances
        const balance = await _token6022Oft.allowance(_owner.address, _otherAccount.address)

        expect(balance).to.equal(BigInt(50))
    })
})
