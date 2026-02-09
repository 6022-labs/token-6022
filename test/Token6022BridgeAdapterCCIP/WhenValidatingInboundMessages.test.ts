import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("When validating inbound messages in Token6022BridgeAdapterCCIP", function () {
  const sourceSelector = 16015286601757825753n;
  const destinationSelector = 14767482510784806043n;

  async function deployFixture() {
    const [ownerA, ownerB, attacker] = await ethers.getSigners();

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

    const adapterFactory = await ethers.getContractFactory("Token6022BridgeAdapterCCIP");
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
      attacker,
      canonicalToken,
      canonicalCore,
      satelliteCore,
      router,
      adapterA,
      adapterB,
    };
  }

  it("Should reject inbound message from untrusted CCIP peer", async function () {
    const { ownerB, attacker, router, adapterB } = await loadFixture(
      deployFixture,
    );

    const transferId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
    const amount = ethers.utils.parseEther("2");
    const data = ethers.utils.defaultAbiCoder.encode(
      ["bytes32", "address", "uint256"],
      [transferId, ownerB.address, amount],
    );

    await expect(
      router.route(adapterB.address, {
        messageId: ethers.utils.hexlify(ethers.utils.randomBytes(32)),
        sourceChainSelector: sourceSelector,
        sender: ethers.utils.defaultAbiCoder.encode(
          ["address"],
          [attacker.address],
        ),
        data,
        destTokenAmounts: [],
      }),
    )
      .to.be.revertedWithCustomError(adapterB, "InvalidCcipPeer")
      .withArgs(sourceSelector, attacker.address);
  });

  it("Should reject transport replay using same CCIP message id", async function () {
    const {
      ownerA,
      ownerB,
      canonicalToken,
      canonicalCore,
      satelliteCore,
      router,
      adapterA,
      adapterB,
    } = await loadFixture(deployFixture);

    const transferId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
    const amount = ethers.utils.parseEther("3");

    await canonicalToken.connect(ownerA).approve(canonicalCore.address, amount);

    const tx = await adapterA
      .connect(ownerA)
      .sendWithCcip(destinationSelector, ownerB.address, amount, transferId, {
        value: 1,
      });
    const receipt = await tx.wait();

    const sendEvent = receipt.events?.find(
      (event: any) =>
        event.address.toLowerCase() === adapterA.address.toLowerCase() &&
        event.event === "CcipSend",
    );
    const messageId = sendEvent?.args?.messageId;

    const data = ethers.utils.defaultAbiCoder.encode(
      ["bytes32", "address", "uint256"],
      [transferId, ownerB.address, amount],
    );

    await expect(
      router.route(adapterB.address, {
        messageId,
        sourceChainSelector: sourceSelector,
        sender: ethers.utils.defaultAbiCoder.encode(
          ["address"],
          [adapterA.address],
        ),
        data,
        destTokenAmounts: [],
      }),
    )
      .to.be.revertedWithCustomError(satelliteCore, "TransportReplay")
      .withArgs(messageId);
  });

  it("Should reject transfer replay with a new message id", async function () {
    const {
      ownerA,
      ownerB,
      canonicalToken,
      canonicalCore,
      satelliteCore,
      router,
      adapterA,
      adapterB,
    } = await loadFixture(deployFixture);

    const transferId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
    const amount = ethers.utils.parseEther("1");

    await canonicalToken.connect(ownerA).approve(canonicalCore.address, amount);
    await adapterA
      .connect(ownerA)
      .sendWithCcip(destinationSelector, ownerB.address, amount, transferId, {
        value: 1,
      });

    const data = ethers.utils.defaultAbiCoder.encode(
      ["bytes32", "address", "uint256"],
      [transferId, ownerB.address, amount],
    );

    await expect(
      router.route(adapterB.address, {
        messageId: ethers.utils.hexlify(ethers.utils.randomBytes(32)),
        sourceChainSelector: sourceSelector,
        sender: ethers.utils.defaultAbiCoder.encode(
          ["address"],
          [adapterA.address],
        ),
        data,
        destTokenAmounts: [],
      }),
    )
      .to.be.revertedWithCustomError(satelliteCore, "TransferReplay")
      .withArgs(transferId);
  });
});
