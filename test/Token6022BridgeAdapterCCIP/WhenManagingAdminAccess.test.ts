import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("When managing admin access in Token6022BridgeAdapterCCIP", function () {
  const sourceSelector = 16015286601757825753n;
  const destinationSelector = 14767482510784806043n;

  async function deployFixture() {
    const [owner, newOwner] = await ethers.getSigners();

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

    const routerFactory = await ethers.getContractFactory("CCIPRouterMock");
    const router = (await routerFactory.deploy(sourceSelector)) as Contract;
    await router.setChainSupported(sourceSelector, true);
    await router.setChainSupported(destinationSelector, true);

    const adapterFactory = await ethers.getContractFactory(
      "Token6022BridgeAdapterCCIP",
    );
    const adapter = (await adapterFactory.deploy(
      canonicalCore.address,
      router.address,
    )) as Contract;

    return { owner, newOwner, canonicalCore, adapter };
  }

  it("Should gate peer and extraArgs configuration by current core owner", async function () {
    const { owner, newOwner, canonicalCore, adapter } = await loadFixture(
      deployFixture,
    );

    await expect(
      adapter.connect(owner).setCcipPeer(destinationSelector, owner.address),
    )
      .to.emit(adapter, "CcipPeerSet")
      .withArgs(destinationSelector, owner.address);

    await canonicalCore.connect(owner).transferOwnership(newOwner.address);

    await expect(
      adapter.connect(owner).setCcipPeer(destinationSelector, newOwner.address),
    )
      .to.be.revertedWithCustomError(adapter, "OnlyCoreOwner")
      .withArgs(owner.address, newOwner.address);

    await expect(adapter.connect(owner).setCcipExtraArgs(destinationSelector, "0x01"))
      .to.be.revertedWithCustomError(adapter, "OnlyCoreOwner")
      .withArgs(owner.address, newOwner.address);

    await expect(
      adapter.connect(newOwner).setCcipPeer(destinationSelector, newOwner.address),
    )
      .to.emit(adapter, "CcipPeerSet")
      .withArgs(destinationSelector, newOwner.address);

    await expect(adapter.connect(newOwner).setCcipExtraArgs(destinationSelector, "0x0102"))
      .to.emit(adapter, "CcipExtraArgsSet")
      .withArgs(destinationSelector, "0x0102");
  });
});
