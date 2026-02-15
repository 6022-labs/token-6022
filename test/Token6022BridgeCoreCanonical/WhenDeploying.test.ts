import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("When deploying Token6022BridgeCoreCanonical", function () {
  async function deployFixture() {
    const [owner, adapter] = await ethers.getSigners();

    const tokenFactory = await ethers.getContractFactory("Token6022");
    const token = (await tokenFactory.deploy(
      owner.address,
      ethers.utils.parseEther("100"),
    )) as Contract;

    const coreFactory = await ethers.getContractFactory("Token6022BridgeCoreCanonical");
    const core = (await coreFactory.deploy(
      token.address,
      owner.address,
    )) as Contract;

    return { owner, adapter, token, core };
  }

  it("Should deploy and persist token address", async function () {
    const { core, token } = await loadFixture(deployFixture);

    expect(core.address).to.not.equal(ethers.constants.AddressZero);
    expect(await core.token()).to.equal(token.address);
  });

  it("Should set deploy owner as owner", async function () {
    const { core, owner } = await loadFixture(deployFixture);

    expect(await core.owner()).to.equal(owner.address);
  });

  it("Should allow owner to authorize an adapter", async function () {
    const { core, adapter } = await loadFixture(deployFixture);

    await expect(core.setAdapter(adapter.address, true))
      .to.emit(core, "AdapterSet")
      .withArgs(adapter.address, true);

    expect(await core.adapters(adapter.address)).to.equal(true);
  });

  it("Should reject adapter authorization from non-owner", async function () {
    const { core, adapter } = await loadFixture(deployFixture);

    await expect(core.connect(adapter).setAdapter(adapter.address, true))
      .to.be.revertedWithCustomError(core, "OwnableUnauthorizedAccount")
      .withArgs(adapter.address);
  });

  it("Should reject zero adapter address", async function () {
    const { core } = await loadFixture(deployFixture);

    await expect(core.setAdapter(ethers.constants.AddressZero, true))
      .to.be.revertedWithCustomError(core, "InvalidAdapter")
      .withArgs(ethers.constants.AddressZero);
  });
});
