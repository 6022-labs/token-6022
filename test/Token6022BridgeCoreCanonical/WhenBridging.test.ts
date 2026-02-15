import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("When bridging with Token6022BridgeCoreCanonical", function () {
  async function deployFixture() {
    const [owner, adapter, receiver, other] = await ethers.getSigners();

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

    await core.connect(owner).setAdapter(adapter.address, true);

    return { owner, adapter, receiver, other, token, core };
  }

  it("Should lock funds on bridgeOut and mark outbound transfer", async function () {
    const { owner, adapter, token, core } = await loadFixture(deployFixture);
    const amount = ethers.utils.parseEther("10");
    const transferId = ethers.utils.hexlify(ethers.utils.randomBytes(32));

    await token.connect(owner).approve(core.address, amount);

    await expect(
      core.connect(adapter).bridgeOut(owner.address, amount, transferId),
    )
      .to.emit(core, "BridgeOut")
      .withArgs(transferId, owner.address, amount);

    expect(await token.balanceOf(owner.address)).to.equal(
      ethers.utils.parseEther("90"),
    );
    expect(await token.balanceOf(core.address)).to.equal(amount);
    expect(await core.outboundTransfers(transferId)).to.equal(true);
  });

  it("Should release funds on bridgeIn and mark inbound transfer + transport", async function () {
    const { owner, adapter, receiver, token, core } = await loadFixture(
      deployFixture,
    );
    const amount = ethers.utils.parseEther("8");
    const outboundTransferId = ethers.utils.hexlify(
      ethers.utils.randomBytes(32),
    );
    const inboundTransferId = ethers.utils.hexlify(
      ethers.utils.randomBytes(32),
    );
    const transportId = ethers.utils.hexlify(ethers.utils.randomBytes(32));

    await token.connect(owner).approve(core.address, amount);
    await core
      .connect(adapter)
      .bridgeOut(owner.address, amount, outboundTransferId);

    await expect(
      core
        .connect(adapter)
        .bridgeIn(receiver.address, amount, inboundTransferId, transportId),
    )
      .to.emit(core, "BridgeIn")
      .withArgs(inboundTransferId, transportId, receiver.address, amount);

    expect(await token.balanceOf(receiver.address)).to.equal(amount);
    expect(await token.balanceOf(core.address)).to.equal(0);
    expect(await core.inboundTransfers(inboundTransferId)).to.equal(true);
    expect(await core.inboundTransportIds(transportId)).to.equal(true);
  });

  it("Should reject bridgeOut from non-adapter", async function () {
    const { owner, other, core } = await loadFixture(deployFixture);

    await expect(
      core
        .connect(other)
        .bridgeOut(
          owner.address,
          1,
          ethers.utils.hexlify(ethers.utils.randomBytes(32)),
        ),
    )
      .to.be.revertedWithCustomError(core, "OnlyAdapter")
      .withArgs(other.address);
  });

  it("Should reject bridgeIn from non-adapter", async function () {
    const { receiver, other, core } = await loadFixture(deployFixture);

    await expect(
      core
        .connect(other)
        .bridgeIn(
          receiver.address,
          1,
          ethers.utils.hexlify(ethers.utils.randomBytes(32)),
          ethers.utils.hexlify(ethers.utils.randomBytes(32)),
        ),
    )
      .to.be.revertedWithCustomError(core, "OnlyAdapter")
      .withArgs(other.address);
  });

  it("Should reject zero amounts for bridgeOut and bridgeIn", async function () {
    const { owner, adapter, receiver, core } = await loadFixture(deployFixture);

    await expect(
      core
        .connect(adapter)
        .bridgeOut(
          owner.address,
          0,
          ethers.utils.hexlify(ethers.utils.randomBytes(32)),
        ),
    ).to.be.revertedWithCustomError(core, "InvalidAmount");

    await expect(
      core
        .connect(adapter)
        .bridgeIn(
          receiver.address,
          0,
          ethers.utils.hexlify(ethers.utils.randomBytes(32)),
          ethers.utils.hexlify(ethers.utils.randomBytes(32)),
        ),
    ).to.be.revertedWithCustomError(core, "InvalidAmount");
  });

  it("Should reject transfer replay on bridgeOut", async function () {
    const { owner, adapter, token, core } = await loadFixture(deployFixture);
    const amount = ethers.utils.parseEther("3");
    const transferId = ethers.utils.hexlify(ethers.utils.randomBytes(32));

    await token.connect(owner).approve(core.address, amount.mul(2));

    await core.connect(adapter).bridgeOut(owner.address, amount, transferId);

    await expect(
      core.connect(adapter).bridgeOut(owner.address, amount, transferId),
    )
      .to.be.revertedWithCustomError(core, "TransferReplay")
      .withArgs(transferId);
  });

  it("Should reject transport replay on bridgeIn", async function () {
    const { owner, adapter, receiver, token, core } = await loadFixture(
      deployFixture,
    );
    const amount = ethers.utils.parseEther("6");

    await token.connect(owner).approve(core.address, amount.mul(2));
    await core
      .connect(adapter)
      .bridgeOut(
        owner.address,
        amount.mul(2),
        ethers.utils.hexlify(ethers.utils.randomBytes(32)),
      );

    const transportId = ethers.utils.hexlify(ethers.utils.randomBytes(32));

    await core
      .connect(adapter)
      .bridgeIn(
        receiver.address,
        amount,
        ethers.utils.hexlify(ethers.utils.randomBytes(32)),
        transportId,
      );

    await expect(
      core
        .connect(adapter)
        .bridgeIn(
          receiver.address,
          amount,
          ethers.utils.hexlify(ethers.utils.randomBytes(32)),
          transportId,
        ),
    )
      .to.be.revertedWithCustomError(core, "TransportReplay")
      .withArgs(transportId);
  });

  it("Should reject transferId reuse between outbound and inbound paths", async function () {
    const { owner, adapter, receiver, token, core } = await loadFixture(
      deployFixture,
    );
    const amount = ethers.utils.parseEther("4");
    const transferId = ethers.utils.hexlify(ethers.utils.randomBytes(32));

    await token.connect(owner).approve(core.address, amount);
    await core.connect(adapter).bridgeOut(owner.address, amount, transferId);

    await expect(
      core
        .connect(adapter)
        .bridgeIn(
          receiver.address,
          amount,
          transferId,
          ethers.utils.hexlify(ethers.utils.randomBytes(32)),
        ),
    )
      .to.be.revertedWithCustomError(core, "TransferReplay")
      .withArgs(transferId);
  });
});
