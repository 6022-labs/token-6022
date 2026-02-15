import { expect } from "chai";
import { deployments, ethers } from "hardhat";
import { Contract, ContractFactory } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("When managing admin access in Token6022BridgeAdapterLZ", function () {
  const eidA = 1;
  const eidB = 2;

  async function deployFixture() {
    const [owner, newOwner, endpointOwner] = await ethers.getSigners();

    const endpointArtifact = await deployments.getArtifact("EndpointV2Mock");
    const endpointFactory = new ContractFactory(
      endpointArtifact.abi,
      endpointArtifact.bytecode,
      endpointOwner,
    );

    const endpointA = (await endpointFactory.deploy(eidA)) as Contract;
    const endpointB = (await endpointFactory.deploy(eidB)) as Contract;

    const tokenFactory = await ethers.getContractFactory("Token6022");
    const canonicalToken = (await tokenFactory.deploy(
      owner.address,
      ethers.utils.parseEther("100"),
    )) as Contract;

    const canonicalCoreFactory = await ethers.getContractFactory(
      "Token6022BridgeCoreCanonical",
    );
    const canonicalCore = (await canonicalCoreFactory.deploy(
      canonicalToken.address,
      owner.address,
    )) as Contract;

    const adapterFactory = await ethers.getContractFactory("Token6022BridgeAdapterLZ");
    const adapter = (await adapterFactory
      .connect(owner)
      .deploy(
        canonicalCore.address,
        endpointA.address,
      )) as Contract;

    return { owner, newOwner, endpointB, canonicalCore, adapter };
  }

  it("Should gate options and peer configuration by current core owner", async function () {
    const { owner, newOwner, endpointB, canonicalCore, adapter } =
      await loadFixture(deployFixture);

    const peer = ethers.utils.hexZeroPad(endpointB.address, 32).toLowerCase();

    await expect(adapter.connect(owner).setLzSendOptions(eidB, "0x0102"))
      .to.emit(adapter, "LzSendOptionsSet")
      .withArgs(eidB, "0x0102");

    await expect(adapter.connect(owner).setPeer(eidB, peer))
      .to.emit(adapter, "PeerSet")
      .withArgs(eidB, peer);

    await canonicalCore.connect(owner).transferOwnership(newOwner.address);

    await expect(adapter.connect(owner).setLzSendOptions(eidB, "0x03"))
      .to.be.revertedWithCustomError(adapter, "OnlyCoreOwner")
      .withArgs(owner.address, newOwner.address);

    await expect(adapter.connect(owner).setPeer(eidB, peer))
      .to.be.revertedWithCustomError(adapter, "OnlyCoreOwner")
      .withArgs(owner.address, newOwner.address);

    await expect(adapter.connect(newOwner).setLzSendOptions(eidB, "0x04"))
      .to.emit(adapter, "LzSendOptionsSet")
      .withArgs(eidB, "0x04");

    await expect(adapter.connect(newOwner).setPeer(eidB, peer))
      .to.emit(adapter, "PeerSet")
      .withArgs(eidB, peer);
  });
});
