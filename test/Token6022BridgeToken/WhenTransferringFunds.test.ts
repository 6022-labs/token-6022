import { expect } from 'chai'
import { BigNumber, Contract, ContractFactory } from 'ethers'
import { deployments, ethers } from 'hardhat'
import { Token6022BridgeToken } from '../../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { reset, loadFixture } from '@nomicfoundation/hardhat-network-helpers'

describe('When transferring funds of Token6022BridgeToken', function () {
    let _token6022Oft: Token6022BridgeToken
    let _owner: SignerWithAddress
    let _otherAccount: SignerWithAddress
    let _endpoint: Contract

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

        return { token6022Oft, otherAccount, owner, endpoint }
    }

    beforeEach(async function () {
        const fixture = await loadFixture(deployToken)
        _owner = fixture.owner
        _token6022Oft = fixture.token6022Oft
        _otherAccount = fixture.otherAccount
        _endpoint = fixture.endpoint
    })

    // Credits tokens to the owner by simulating a LayerZero inbound message.
    async function creditOwner(amountLD: BigNumber) {
        const remoteEid = 101
        const remotePeer = ethers.utils.hexZeroPad(_token6022Oft.address, 32)

        await _token6022Oft.connect(_owner).setPeer(remoteEid, remotePeer)

        const conversionRate = await _token6022Oft.decimalConversionRate()
        const amountSD = amountLD.div(conversionRate)

        const recipientBytes = ethers.utils.hexZeroPad(_owner.address, 32)
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

        await _endpoint.receivePayload(
            origin,
            _token6022Oft.address,
            payloadHash,
            payload,
            executeGas,
            0,
            guid
        )
    }

    describe('Given transferrer does not have enough funds', function () {
        it('Should revert', async function () {
            let transferValue = ethers.utils.parseUnits('6', 16)
            await expect(_token6022Oft.transfer(_token6022Oft.address, transferValue)).to.be.reverted
        })
    })

    describe('Given transferrer has enough funds', function () {
        it("Should emit 'Transfer' event", async function () {
            const mintAmount = ethers.utils.parseUnits('1', 18)
            await creditOwner(mintAmount)

            expect(await _token6022Oft.balanceOf(_owner.address)).to.equal(mintAmount)

            const transferValue = ethers.utils.parseUnits('1', 16)
            await expect(_token6022Oft.transfer(_otherAccount.address, transferValue))
                .emit(_token6022Oft, 'Transfer')
                .withArgs(_owner.address, _otherAccount.address, transferValue)
        })
    })
})
