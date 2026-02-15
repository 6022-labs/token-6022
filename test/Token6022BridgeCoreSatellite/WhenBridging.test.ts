import { expect } from "chai";
import { ethers } from "hardhat";
import { Contract } from "ethers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("When bridging with Token6022BridgeCoreSatellite", function () {
  async function deployFixture() {
    const [owner, adapter, receiver, other] = await ethers.getSigners();

    const coreFactory = await ethers.getContractFactory("Token6022BridgeCoreSatellite");
    const core = (await coreFactory.deploy(
      "6022",
      "6022",
      owner.address,
    )) as Contract;

    await core.connect(owner).setAdapter(adapter.address, true);

    return { owner, adapter, receiver, other, core };
  }

  it("Should mint on bridgeIn and burn on bridgeOut", async function () {
    const { owner, adapter, receiver, core } = await loadFixture(deployFixture);

    const inboundTransferId = ethers.utils.hexlify(
      ethers.utils.randomBytes(32),
    );
    const transportId = ethers.utils.hexlify(ethers.utils.randomBytes(32));
    const amount = ethers.utils.parseEther("9");

    await core
      .connect(adapter)
      .bridgeIn(owner.address, amount, inboundTransferId, transportId);

    expect(await core.balanceOf(owner.address)).to.equal(amount);

    const outboundTransferId = ethers.utils.hexlify(
      ethers.utils.randomBytes(32),
    );
    await core
      .connect(adapter)
      .bridgeOut(
        owner.address,
        ethers.utils.parseEther("4"),
        outboundTransferId,
      );

    expect(await core.balanceOf(owner.address)).to.equal(
      ethers.utils.parseEther("5"),
    );
    expect(await core.totalSupply()).to.equal(ethers.utils.parseEther("5"));
    expect(await core.outboundTransfers(outboundTransferId)).to.equal(true);

    const secondTransportId = ethers.utils.hexlify(
      ethers.utils.randomBytes(32),
    );
    const secondInboundTransferId = ethers.utils.hexlify(
      ethers.utils.randomBytes(32),
    );
    await core
      .connect(adapter)
      .bridgeIn(
        receiver.address,
        ethers.utils.parseEther("2"),
        secondInboundTransferId,
        secondTransportId,
      );

    expect(await core.balanceOf(receiver.address)).to.equal(
      ethers.utils.parseEther("2"),
    );
  });

  it("Should redirect bridgeIn to dead address when receiver is zero", async function () {
    const { adapter, core } = await loadFixture(deployFixture);
    const amount = ethers.utils.parseEther("1");

    await core
      .connect(adapter)
      .bridgeIn(
        ethers.constants.AddressZero,
        amount,
        ethers.utils.hexlify(ethers.utils.randomBytes(32)),
        ethers.utils.hexlify(ethers.utils.randomBytes(32)),
      );

    expect(
      await core.balanceOf("0x000000000000000000000000000000000000dEaD"),
    ).to.equal(amount);
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

  it("Should reject zero amounts", async function () {
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

  it("Should reject transfer replay", async function () {
    const { owner, adapter, core } = await loadFixture(deployFixture);
    const transferId = ethers.utils.hexlify(ethers.utils.randomBytes(32));

    await core
      .connect(adapter)
      .bridgeIn(
        owner.address,
        ethers.utils.parseEther("2"),
        transferId,
        ethers.utils.hexlify(ethers.utils.randomBytes(32)),
      );

    await expect(
      core
        .connect(adapter)
        .bridgeIn(
          owner.address,
          ethers.utils.parseEther("2"),
          transferId,
          ethers.utils.hexlify(ethers.utils.randomBytes(32)),
        ),
    )
      .to.be.revertedWithCustomError(core, "TransferReplay")
      .withArgs(transferId);
  });

  it("Should reject transport replay", async function () {
    const { owner, adapter, core } = await loadFixture(deployFixture);
    const transportId = ethers.utils.hexlify(ethers.utils.randomBytes(32));

    await core
      .connect(adapter)
      .bridgeIn(
        owner.address,
        ethers.utils.parseEther("2"),
        ethers.utils.hexlify(ethers.utils.randomBytes(32)),
        transportId,
      );

    await expect(
      core
        .connect(adapter)
        .bridgeIn(
          owner.address,
          ethers.utils.parseEther("2"),
          ethers.utils.hexlify(ethers.utils.randomBytes(32)),
          transportId,
        ),
    )
      .to.be.revertedWithCustomError(core, "TransportReplay")
      .withArgs(transportId);
  });
});
