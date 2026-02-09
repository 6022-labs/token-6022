import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("When sending through Token6022BridgeAdapterCCIP", function () {
  const sourceSelector = 16015286601757825753n;
  const destinationSelector = 14767482510784806043n;

  async function deployFixture() {
    const [ownerA, ownerB] = await ethers.getSigners();

    const tokenFactory = await ethers.getContractFactory("Token6022");
    const canonicalToken = (await tokenFactory.deploy(
      ownerA.address,
      ethers.utils.parseEther("100"),
    )) as Contract;

    const canonicalCoreFactory = await ethers.getContractFactory(
      "Token6022BridgeCoreCanonical",
    );
    const canonicalCore = (await canonicalCoreFactory.deploy(
      canonicalToken.address,
      ownerA.address,
    )) as Contract;

    const satelliteCoreFactory = await ethers.getContractFactory(
      "Token6022BridgeCoreSatellite",
    );
    const satelliteCore = (await satelliteCoreFactory.deploy(
      "6022",
      "6022",
      ownerB.address,
    )) as Contract;

    const routerFactory = await ethers.getContractFactory("CCIPRouterMock");
    const router = (await routerFactory.deploy(sourceSelector)) as Contract;
    await router.setChainSupported(sourceSelector, true);
    await router.setChainSupported(destinationSelector, true);

    const adapterFactory = await ethers.getContractFactory(
      "Token6022BridgeAdapterCCIP",
    );
    const adapterA = (await adapterFactory.deploy(
      canonicalCore.address,
      router.address,
      ownerA.address,
    )) as Contract;
    const adapterB = (await adapterFactory.deploy(
      satelliteCore.address,
      router.address,
      ownerB.address,
    )) as Contract;

    await canonicalCore.connect(ownerA).setAdapter(adapterA.address, true);
    await satelliteCore.connect(ownerB).setAdapter(adapterB.address, true);

    await adapterA
      .connect(ownerA)
      .setCcipPeer(destinationSelector, adapterB.address);
    await adapterA
      .connect(ownerA)
      .setCcipPeer(sourceSelector, adapterB.address);
    await adapterB
      .connect(ownerB)
      .setCcipPeer(sourceSelector, adapterA.address);
    await adapterB
      .connect(ownerB)
      .setCcipPeer(destinationSelector, adapterA.address);

    return {
      ownerA,
      ownerB,
      canonicalToken,
      canonicalCore,
      satelliteCore,
      router,
      adapterA,
      adapterB,
    };
  }

  it("Should quote and bridge from canonical to satellite", async function () {
    const {
      ownerA,
      ownerB,
      canonicalToken,
      canonicalCore,
      satelliteCore,
      adapterA,
    } = await loadFixture(deployFixture);

    const amount = ethers.utils.parseEther("5");
    const transferId = ethers.utils.hexlify(ethers.utils.randomBytes(32));

    const fee = await adapterA.quoteCcipSend(
      destinationSelector,
      ownerB.address,
      amount,
      transferId,
    );
    expect(fee).to.equal(1);

    await canonicalToken.connect(ownerA).approve(canonicalCore.address, amount);

    await expect(
      adapterA
        .connect(ownerA)
        .sendWithCcip(destinationSelector, ownerB.address, amount, transferId, {
          value: fee,
        }),
    ).to.emit(adapterA, "CcipSend");

    expect(await canonicalToken.balanceOf(ownerA.address)).to.equal(
      ethers.utils.parseEther("95"),
    );
    expect(await canonicalToken.balanceOf(canonicalCore.address)).to.equal(
      amount,
    );
    expect(await satelliteCore.balanceOf(ownerB.address)).to.equal(amount);
    expect(await canonicalCore.outboundTransfers(transferId)).to.equal(true);
  });

  it("Should bridge back from satellite to canonical", async function () {
    const {
      ownerA,
      ownerB,
      canonicalToken,
      canonicalCore,
      satelliteCore,
      adapterA,
      adapterB,
    } = await loadFixture(deployFixture);

    const amountOut = ethers.utils.parseEther("7");
    const amountBack = ethers.utils.parseEther("3");

    const transferOutId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
    const transferBackId = ethers.utils.hexlify(ethers.utils.randomBytes(32));

    await canonicalToken
      .connect(ownerA)
      .approve(canonicalCore.address, amountOut);
    await adapterA
      .connect(ownerA)
      .sendWithCcip(
        destinationSelector,
        ownerB.address,
        amountOut,
        transferOutId,
        { value: 1 },
      );

    await adapterB
      .connect(ownerB)
      .sendWithCcip(
        sourceSelector,
        ownerA.address,
        amountBack,
        transferBackId,
        { value: 1 },
      );

    expect(await canonicalToken.balanceOf(ownerA.address)).to.equal(
      ethers.utils.parseEther("96"),
    );
    expect(await satelliteCore.balanceOf(ownerB.address)).to.equal(
      ethers.utils.parseEther("4"),
    );
    expect(await canonicalToken.balanceOf(canonicalCore.address)).to.equal(
      ethers.utils.parseEther("4"),
    );
  });

  it("Should revert when recipient is zero address", async function () {
    const { ownerA, canonicalToken, canonicalCore, adapterA } =
      await loadFixture(deployFixture);

    const amount = ethers.utils.parseEther("1");
    const transferId = ethers.utils.hexlify(ethers.utils.randomBytes(32));

    await canonicalToken.connect(ownerA).approve(canonicalCore.address, amount);

    await expect(
      adapterA
        .connect(ownerA)
        .sendWithCcip(
          destinationSelector,
          ethers.constants.AddressZero,
          amount,
          transferId,
          {
            value: 0,
          },
        ),
    )
      .to.be.revertedWithCustomError(adapterA, "InvalidRecipient")
      .withArgs(ethers.constants.AddressZero);

    expect(await canonicalToken.balanceOf(ownerA.address)).to.equal(
      ethers.utils.parseEther("100"),
    );
    expect(await canonicalToken.balanceOf(canonicalCore.address)).to.equal(0);
    expect(await canonicalCore.outboundTransfers(transferId)).to.equal(false);
  });

  it("Should revert when peer is missing", async function () {
    const [owner] = await ethers.getSigners();

    const tokenFactory = await ethers.getContractFactory("Token6022");
    const token = (await tokenFactory.deploy(
      owner.address,
      ethers.utils.parseEther("10"),
    )) as Contract;

    const coreFactory = await ethers.getContractFactory(
      "Token6022BridgeCoreCanonical",
    );
    const core = (await coreFactory.deploy(
      token.address,
      owner.address,
    )) as Contract;

    const routerFactory = await ethers.getContractFactory("CCIPRouterMock");
    const router = (await routerFactory.deploy(sourceSelector)) as Contract;
    await router.setChainSupported(destinationSelector, true);

    const adapterFactory = await ethers.getContractFactory(
      "Token6022BridgeAdapterCCIP",
    );
    const adapter = (await adapterFactory.deploy(
      core.address,
      router.address,
      owner.address,
    )) as Contract;

    await core.setAdapter(adapter.address, true);
    await token.approve(core.address, ethers.utils.parseEther("1"));

    await expect(
      adapter.sendWithCcip(
        destinationSelector,
        owner.address,
        ethers.utils.parseEther("1"),
        ethers.utils.hexlify(ethers.utils.randomBytes(32)),
        { value: 1 },
      ),
    )
      .to.be.revertedWithCustomError(adapter, "MissingCcipPeer")
      .withArgs(destinationSelector);
  });

  it("Should revert when provided fee is too low", async function () {
    const { ownerA, ownerB, canonicalToken, canonicalCore, adapterA } =
      await loadFixture(deployFixture);

    const amount = ethers.utils.parseEther("1");
    const transferId = ethers.utils.hexlify(ethers.utils.randomBytes(32));

    await canonicalToken.connect(ownerA).approve(canonicalCore.address, amount);

    await expect(
      adapterA
        .connect(ownerA)
        .sendWithCcip(destinationSelector, ownerB.address, amount, transferId, {
          value: 0,
        }),
    )
      .to.be.revertedWithCustomError(adapterA, "InvalidNativeFee")
      .withArgs(0, 1);
  });
});
