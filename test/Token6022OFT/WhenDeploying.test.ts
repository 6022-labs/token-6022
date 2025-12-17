import { expect } from 'chai'
import { Contract, ContractFactory } from 'ethers'
import { deployments, ethers } from 'hardhat'
import { Token6022OFT } from '../../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { reset, loadFixture } from '@nomicfoundation/hardhat-network-helpers'

describe('When deploying Token6022OFT', function () {
    let _token6022Oft: Token6022OFT
    let _delegate: SignerWithAddress
    let _endpoint: Contract

    async function deployToken() {
        await reset()

        const [delegate, endpointOwner] = await ethers.getSigners()

        const endpointArtifact = await deployments.getArtifact('EndpointV2Mock')
        const endpointFactory = new ContractFactory(
            endpointArtifact.abi,
            endpointArtifact.bytecode,
            endpointOwner
        )
        const endpoint = await endpointFactory.deploy(1)
        await endpoint.deployed()

        const tokenFactory = await ethers.getContractFactory('Token6022OFT', delegate)
        const token6022Oft = (await tokenFactory.deploy(
            endpoint.address,
            delegate.address
        )) as unknown as Token6022OFT

        return { token6022Oft, delegate, endpoint }
    }

    beforeEach(async function () {
        const fixture = await loadFixture(deployToken)
        _token6022Oft = fixture.token6022Oft
        _delegate = fixture.delegate
        _endpoint = fixture.endpoint
    })

    it('Should deploy', async function () {
        expect(_token6022Oft.address).to.not.equal(ethers.constants.AddressZero)
    })

    it('Should set the delegate as the owner', async function () {
        expect(await _token6022Oft.owner()).to.equal(_delegate.address)
    })

    it('Should persist the provided endpoint', async function () {
        expect(await _token6022Oft.endpoint()).to.equal(_endpoint.address)
    })

    it('Should start with zero total supply', async function () {
        expect(await _token6022Oft.totalSupply()).to.equal(0)
    })
})
