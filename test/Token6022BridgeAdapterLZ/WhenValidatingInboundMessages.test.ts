import { expect } from "chai";
import { deployments, ethers } from "hardhat";
import { Contract, ContractFactory } from "ethers";
import { Options } from "@layerzerolabs/lz-v2-utilities";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("When validating inbound messages in Token6022BridgeAdapterLZ", function () {
  const eidA = 1;
  const eidB = 2;

  async function deployFixture() {
    const [ownerA, ownerB, endpointOwner, attacker] = await ethers.getSigners();

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

    const adapterFactory = await ethers.getContractFactory("Token6022BridgeAdapterLZ");
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
      attacker,
      canonicalToken,
      canonicalCore,
      satelliteCore,
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

  it("Should ignore payload from an untrusted LayerZero peer", async function () {
    const { ownerB, attacker, endpointB, satelliteCore, adapterB } =
      await loadFixture(deployFixture);

    const transferId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
    const amount = ethers.utils.parseEther("1");
    const payload = ethers.utils.defaultAbiCoder.encode(
      ["bytes32", "address", "uint256"],
      [transferId, ownerB.address, amount],
    );
    const payloadHash = ethers.utils.keccak256(payload);

    const origin = {
      srcEid: eidA,
      sender: ethers.utils.hexZeroPad(attacker.address, 32),
      nonce: 1,
    };

    await endpointB.receivePayload(
      origin,
      adapterB.address,
      payloadHash,
      payload,
      200000,
      0,
      ethers.utils.hexlify(ethers.utils.randomBytes(32)),
    );

    expect(await satelliteCore.balanceOf(ownerB.address)).to.equal(0);
    expect(await satelliteCore.inboundTransfers(transferId)).to.equal(false);
  });

  it("Should ignore transport replay with same guid", async function () {
    const {
      ownerA,
      ownerB,
      canonicalToken,
      canonicalCore,
      satelliteCore,
      endpointB,
      adapterA,
      adapterB,
    } = await loadFixture(deployFixture);

    const amount = ethers.utils.parseEther("2");
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
    const tx = await adapterA
      .connect(ownerA)
      .sendWithLz(eidB, ownerB.address, amount, transferId, options, {
        value: quote.nativeFee ?? quote[0],
      });
    const receipt = await tx.wait();

    const sendEvent = receipt.events?.find(
      (event: any) =>
        event.address.toLowerCase() === adapterA.address.toLowerCase() &&
        event.event === "LzSend",
    );
    const guid = sendEvent?.args?.guid;

    const payload = ethers.utils.defaultAbiCoder.encode(
      ["bytes32", "address", "uint256"],
      [transferId, ownerB.address, amount],
    );
    const payloadHash = ethers.utils.keccak256(payload);

    const origin = {
      srcEid: eidA,
      sender: ethers.utils.hexZeroPad(adapterA.address, 32),
      nonce: 2,
    };

    await endpointB.receivePayload(
      origin,
      adapterB.address,
      payloadHash,
      payload,
      200000,
      0,
      guid,
    );

    expect(await satelliteCore.balanceOf(ownerB.address)).to.equal(amount);
    expect(await satelliteCore.inboundTransportIds(guid)).to.equal(true);
  });

  it("Should ignore transfer replay with a new guid", async function () {
    const {
      ownerA,
      ownerB,
      canonicalToken,
      canonicalCore,
      satelliteCore,
      endpointB,
      adapterA,
      adapterB,
    } = await loadFixture(deployFixture);

    const amount = ethers.utils.parseEther("1");
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
    await adapterA
      .connect(ownerA)
      .sendWithLz(eidB, ownerB.address, amount, transferId, options, {
        value: quote.nativeFee ?? quote[0],
      });

    const replayGuid = ethers.utils.hexlify(ethers.utils.randomBytes(32));
    const payload = ethers.utils.defaultAbiCoder.encode(
      ["bytes32", "address", "uint256"],
      [transferId, ownerB.address, amount],
    );
    const payloadHash = ethers.utils.keccak256(payload);

    const origin = {
      srcEid: eidA,
      sender: ethers.utils.hexZeroPad(adapterA.address, 32),
      nonce: 3,
    };

    await endpointB.receivePayload(
      origin,
      adapterB.address,
      payloadHash,
      payload,
      200000,
      0,
      replayGuid,
    );

    expect(await satelliteCore.balanceOf(ownerB.address)).to.equal(amount);
    expect(await satelliteCore.inboundTransfers(transferId)).to.equal(true);
    expect(await satelliteCore.inboundTransportIds(replayGuid)).to.equal(false);
  });
});
