import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("When deploying Token6022BridgeCoreSatellite", function () {
  async function deployFixture() {
    const [owner, adapter, other] = await ethers.getSigners();

    const coreFactory = await ethers.getContractFactory("Token6022BridgeCoreSatellite");
    const core = (await coreFactory.deploy(
      "6022",
      "6022",
      owner.address,
    )) as Contract;

    return { owner, adapter, other, core };
  }

  async function mintViaAdapter(
    core: Contract,
    ownerAddress: string,
    adapterAddress: string,
    amount: string,
  ) {
    await core.setAdapter(adapterAddress, true);
    await core
      .connect(await ethers.getSigner(adapterAddress))
      .bridgeIn(
        ownerAddress,
        ethers.utils.parseEther(amount),
        ethers.utils.hexlify(ethers.utils.randomBytes(32)),
        ethers.utils.hexlify(ethers.utils.randomBytes(32)),
      );
  }

  it("Should deploy with expected metadata and owner", async function () {
    const { core, owner } = await loadFixture(deployFixture);

    expect(await core.name()).to.equal("6022");
    expect(await core.symbol()).to.equal("6022");
    expect(await core.decimals()).to.equal(18);
    expect(await core.totalSupply()).to.equal(0);
    expect(await core.owner()).to.equal(owner.address);
  });

  it("Should allow approvals once tokens are minted", async function () {
    const { core, owner, adapter, other } = await loadFixture(deployFixture);

    await core.setAdapter(adapter.address, true);
    await core
      .connect(adapter)
      .bridgeIn(
        owner.address,
        ethers.utils.parseEther("5"),
        ethers.utils.hexlify(ethers.utils.randomBytes(32)),
        ethers.utils.hexlify(ethers.utils.randomBytes(32)),
      );

    await core.connect(owner).approve(other.address, 50);

    expect(await core.allowance(owner.address, other.address)).to.equal(50);
  });

  it("Should emit Transfer on token transfer", async function () {
    const { core, owner, adapter, other } = await loadFixture(deployFixture);

    await core.setAdapter(adapter.address, true);
    await core
      .connect(adapter)
      .bridgeIn(
        owner.address,
        ethers.utils.parseEther("3"),
        ethers.utils.hexlify(ethers.utils.randomBytes(32)),
        ethers.utils.hexlify(ethers.utils.randomBytes(32)),
      );

    const amount = ethers.utils.parseEther("1");

    await expect(core.connect(owner).transfer(other.address, amount))
      .to.emit(core, "Transfer")
      .withArgs(owner.address, other.address, amount);
  });

  it("Should revert transfer when balance is insufficient", async function () {
    const { core, owner } = await loadFixture(deployFixture);

    await expect(
      core.connect(owner).transfer(core.address, ethers.utils.parseEther("1")),
    ).to.be.reverted;
  });
});
