import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Token6022 } from '../../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { reset, loadFixture } from '@nomicfoundation/hardhat-network-helpers'

describe('When allowing funds of Token6022', function () {
    const totalSupply = ethers.utils.parseUnits('5', 16)

    let _token6022: Token6022

    let _owner: SignerWithAddress
    let _otherAccount: SignerWithAddress

    async function deployToken() {
        await reset()

        // Contracts are deployed using the first signer/account by default
        const [owner, otherAccount] = await ethers.getSigners()

        const Token6022 = await ethers.getContractFactory('Token6022')
        const token6022 = (await Token6022.deploy(owner.address, totalSupply)) as unknown as Token6022

        return { token6022, otherAccount, owner }
    }

    beforeEach(async function () {
        const fixture = await loadFixture(deployToken)
        _owner = fixture.owner
        _token6022 = fixture.token6022
        _otherAccount = fixture.otherAccount
    })

    it('Should allow funds', async function () {
        // Approve 50 tokens from owner to otherAccount
        await _token6022.approve(_otherAccount.address, 50)

        // Check balances
        const balance = await _token6022.allowance(_owner.address, _otherAccount.address)

        expect(balance).to.equal(BigInt(50))
    })
})
