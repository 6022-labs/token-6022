import { expect } from 'chai'
import { ethers } from 'hardhat'
import { Token6022 } from '../../typechain-types'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { reset, loadFixture } from '@nomicfoundation/hardhat-network-helpers'

describe('When deploying Token6022', function () {
    const totalSupply = ethers.utils.parseUnits('5', 16)

    let _token6022: Token6022
    let _owner: SignerWithAddress

    async function deployToken() {
        await reset()

        // Contracts are deployed using the first signer/account by default
        const [owner] = await ethers.getSigners()

        const Token6022 = await ethers.getContractFactory('Token6022')
        const token6022 = (await Token6022.deploy(owner.address, totalSupply)) as unknown as Token6022

        return { token6022, owner }
    }

    beforeEach(async function () {
        const fixture = await loadFixture(deployToken)
        _owner = fixture.owner
        _token6022 = fixture.token6022
    })

    it('Should deploy', async function () {
        expect(await _token6022.address).not.be.undefined
    })

    it('Should set a corresponding total supply to the initial supply', async function () {
        expect(await _token6022.totalSupply()).to.equal(totalSupply)
    })

    it('Should send the total supply to the caller', async function () {
        expect(await _token6022.balanceOf(_owner.address)).to.equal(totalSupply)
    })
})
