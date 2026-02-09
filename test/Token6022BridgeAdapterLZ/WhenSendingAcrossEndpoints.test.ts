import { expect } from "chai";
import { deployments, ethers } from "hardhat";
import { Contract, ContractFactory } from "ethers";
import { Options } from "@layerzerolabs/lz-v2-utilities";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("When sending through Token6022BridgeAdapterLZ", function () {
  const eidA = 1;
  const eidB = 2;

  async function deployFixture() {
    const [ownerA, ownerB, endpointOwner] = await ethers.getSigners();

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

    const adapterFactory = await ethers.getContractFactory(
      "Token6022BridgeAdapterLZ",
    );
    const adapterA = (await adapterFactory
      .connect(ownerA)
      .deploy(
        canonicalCore.address,
        endpointA.address,
        ownerA.address,
      )) as Contract;
    const adapterB = (await adapterFactory
      .connect(ownerB)
      .deploy(
        satelliteCore.address,
        endpointB.address,
        ownerB.address,
      )) as Contract;

    await canonicalCore.connect(ownerA).setAdapter(adapterA.address, true);
    await satelliteCore.connect(ownerB).setAdapter(adapterB.address, true);

    await endpointA.setDestLzEndpoint(adapterB.address, endpointB.address);
    await endpointB.setDestLzEndpoint(adapterA.address, endpointA.address);

    await adapterA
      .connect(ownerA)
      .setPeer(eidB, ethers.utils.hexZeroPad(adapterB.address, 32));
    await adapterB
      .connect(ownerB)
      .setPeer(eidA, ethers.utils.hexZeroPad(adapterA.address, 32));

    return {
      ownerA,
      ownerB,
      canonicalToken,
      canonicalCore,
      satelliteCore,
      endpointA,
      endpointB,
      adapterA,
      adapterB,
    };
  }

  function getOptions() {
    return Options.newOptions()
      .addExecutorLzReceiveOption(200000, 0)
      .toHex()
      .toString();
  }

  function getNativeFee(quote: any) {
    return quote.nativeFee ?? quote[0];
  }

  it("Should bridge from canonical to satellite", async function () {
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
    const options = getOptions();

    await canonicalToken.connect(ownerA).approve(canonicalCore.address, amount);

    const quote = await adapterA.quoteLzSend(
      eidB,
      ownerB.address,
      amount,
      transferId,
      options,
      false,
    );
    const nativeFee = getNativeFee(quote);

    await expect(
      adapterA
        .connect(ownerA)
        .sendWithLz(eidB, ownerB.address, amount, transferId, options, {
          value: nativeFee,
        }),
    ).to.emit(adapterA, "LzSend");

    expect(await canonicalToken.balanceOf(ownerA.address)).to.equal(
      ethers.utils.parseEther("95"),
    );
    expect(await canonicalToken.balanceOf(canonicalCore.address)).to.equal(
      amount,
    );
    expect(await satelliteCore.balanceOf(ownerB.address)).to.equal(amount);
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

    const amountOut = ethers.utils.parseEther("6");
    const amountBack = ethers.utils.parseEther("2");
    const options = getOptions();

    await canonicalToken
      .connect(ownerA)
      .approve(canonicalCore.address, amountOut);

    const transferOutId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
    const quoteOut = await adapterA.quoteLzSend(
      eidB,
      ownerB.address,
      amountOut,
      transferOutId,
      options,
      false,
    );
    await adapterA
      .connect(ownerA)
      .sendWithLz(eidB, ownerB.address, amountOut, transferOutId, options, {
        value: getNativeFee(quoteOut),
      });

    const transferBackId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
    const quoteBack = await adapterB.quoteLzSend(
      eidA,
      ownerA.address,
      amountBack,
      transferBackId,
      options,
      false,
    );
    await adapterB
      .connect(ownerB)
      .sendWithLz(eidA, ownerA.address, amountBack, transferBackId, options, {
        value: getNativeFee(quoteBack),
      });

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

  it("Should use stored options when send options are empty", async function () {
    const {
      ownerA,
      ownerB,
      canonicalToken,
      canonicalCore,
      satelliteCore,
      adapterA,
    } = await loadFixture(deployFixture);

    const amount = ethers.utils.parseEther("3");
    const transferId = ethers.utils.hexlify(ethers.utils.randomBytes(32));

    await canonicalToken.connect(ownerA).approve(canonicalCore.address, amount);

    const defaultOptions = getOptions();
    await adapterA.connect(ownerA).setLzSendOptions(eidB, defaultOptions);

    const quote = await adapterA.quoteLzSend(
      eidB,
      ownerB.address,
      amount,
      transferId,
      "0x",
      false,
    );
    await adapterA
      .connect(ownerA)
      .sendWithLz(eidB, ownerB.address, amount, transferId, "0x", {
        value: getNativeFee(quote),
      });

    expect(await satelliteCore.balanceOf(ownerB.address)).to.equal(amount);
  });

  it("Should revert when recipient is zero address", async function () {
    const { ownerA, canonicalToken, canonicalCore, adapterA } =
      await loadFixture(deployFixture);

    const amount = ethers.utils.parseEther("1");
    const transferId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
    const options = getOptions();

    await canonicalToken.connect(ownerA).approve(canonicalCore.address, amount);

    await expect(
      adapterA
        .connect(ownerA)
        .sendWithLz(
          eidB,
          ethers.constants.AddressZero,
          amount,
          transferId,
          options,
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

  it("Should revert when provided native fee is too low", async function () {
    const { ownerA, ownerB, canonicalToken, canonicalCore, adapterA } =
      await loadFixture(deployFixture);

    const amount = ethers.utils.parseEther("1");
    const transferId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
    const options = getOptions();

    await canonicalToken.connect(ownerA).approve(canonicalCore.address, amount);

    await expect(
      adapterA
        .connect(ownerA)
        .sendWithLz(eidB, ownerB.address, amount, transferId, options, {
          value: 0,
        }),
    ).to.be.revertedWithCustomError(adapterA, "InvalidNativeFee");
  });
});
