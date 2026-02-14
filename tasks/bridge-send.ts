import fs from "fs/promises";
import path from "path";

import { BigNumber, Contract, ContractReceipt, Signer } from "ethers";
import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import {
  CcipOmniGraphHardhat,
  CcipPointHardhat,
  normalizeChainSelector,
} from "./ccip-config";
import { LzOmniGraphHardhat, LzPointHardhat } from "./lz-config";

interface BridgeSendCommonArgs {
  adapter: string;
  to: string;
  amount: string;
  transferId?: string;
}

interface LzSendArgs extends BridgeSendCommonArgs {
  dstEid: number;
  options: string;
  lzConfig: string;
}

interface CcipSendArgs extends BridgeSendCommonArgs {
  dstChainSelector: string;
  ccipConfig: string;
}

interface MeshPoint {
  network: string;
  contractName?: string;
  address?: string;
}

async function resolveAdapterAddress(
  adapter: string,
  hre: HardhatRuntimeEnvironment,
): Promise<string> {
  if (hre.ethers.utils.isAddress(adapter)) {
    return hre.ethers.utils.getAddress(adapter);
  }

  const deployment = await hre.deployments.getOrNull(adapter);
  if (deployment == null) {
    throw new Error(
      `Could not resolve adapter "${adapter}" as an address or deployment name`,
    );
  }

  return hre.ethers.utils.getAddress(deployment.address);
}

async function loadGraph<T>(configPath: string): Promise<T> {
  const module = await import(path.resolve("./", configPath));
  const loaded = module.default;

  if (typeof loaded === "function") {
    return await loaded();
  }

  return loaded as T;
}

async function resolvePointAddress(
  point: MeshPoint,
  hre: HardhatRuntimeEnvironment,
): Promise<string> {
  if (point.address != null) {
    return hre.ethers.utils.getAddress(point.address);
  }

  if (point.contractName == null) {
    throw new Error(
      `Point on network "${point.network}" must define either "address" or "contractName"`,
    );
  }

  if (point.network === hre.network.name) {
    const deployment = await hre.deployments.get(point.contractName);
    return hre.ethers.utils.getAddress(deployment.address);
  }

  const deploymentPath = path.join(
    hre.config.paths.deployments,
    point.network,
    `${point.contractName}.json`,
  );

  try {
    const content = await fs.readFile(deploymentPath, "utf8");
    const parsed = JSON.parse(content) as { address?: string };

    if (parsed.address == null) {
      throw new Error(`No address found in ${deploymentPath}`);
    }

    return hre.ethers.utils.getAddress(parsed.address);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `Could not resolve ${point.contractName} on "${point.network}". ` +
          `Missing deployment file: ${deploymentPath}. ` +
          `Set an explicit "address" in the mesh config for this point.`,
      );
    }

    throw error;
  }
}

function resolveTransferId(
  transferId: string | undefined,
  hre: HardhatRuntimeEnvironment,
): string {
  if (transferId == null || transferId === "") {
    return hre.ethers.utils.hexlify(hre.ethers.utils.randomBytes(32));
  }

  const normalized = hre.ethers.utils.hexlify(transferId);
  const length = hre.ethers.utils.hexDataLength(normalized);
  if (length > 32) {
    throw new Error(
      `transferId must be at most 32 bytes, received ${length} bytes`,
    );
  }

  return hre.ethers.utils.hexZeroPad(normalized, 32);
}

async function resolveAmountAndApproveIfNeeded(
  coreAddress: string,
  amount: string,
  signerAddress: string,
  hre: HardhatRuntimeEnvironment,
): Promise<{ amountLD: BigNumber; decimals: number; canonicalToken?: string }> {
  const signer = (await hre.ethers.getSigners())[0];
  if (signer == null) {
    throw new Error("No signer available for this network");
  }

  const canonicalCore = new Contract(
    coreAddress,
    ["function token() view returns (address)"],
    signer,
  );

  let decimalsSourceAddress = coreAddress;
  let canonicalToken: string | undefined;

  try {
    canonicalToken = hre.ethers.utils.getAddress(await canonicalCore.token());
    decimalsSourceAddress = canonicalToken;
  } catch {
    canonicalToken = undefined;
  }

  const asset = new Contract(
    decimalsSourceAddress,
    [
      "function decimals() view returns (uint8)",
      "function allowance(address owner, address spender) view returns (uint256)",
      "function approve(address spender, uint256 value) returns (bool)",
    ],
    signer,
  );

  const decimals = Number(await asset.decimals());
  const amountLD = hre.ethers.utils.parseUnits(amount, decimals);

  if (canonicalToken != null) {
    const allowance: BigNumber = await asset.allowance(
      signerAddress,
      coreAddress,
    );
    if (allowance.lt(amountLD)) {
      console.log(`\n✅ Approving canonical token...`);
      console.log(`📍 Token: ${canonicalToken}`);
      console.log(`🔀 Spender: ${coreAddress}`);
      console.log(`💰 Amount: ${amountLD.toString()}`);
      const approvalTx = await asset.approve(coreAddress, amountLD);
      await approvalTx.wait();
      console.log(`✅ Approval confirmed!`);
      console.log(`📝 Tx: ${approvalTx.hash}`);
    }
  }

  return { amountLD, decimals, canonicalToken };
}

async function assertAdapterAuthorized(
  coreAddress: string,
  adapterAddress: string,
  signer: Signer,
): Promise<void> {
  const core = new Contract(
    coreAddress,
    ["function adapters(address) view returns (bool)"],
    signer,
  );
  const isAuthorized: boolean = await core.adapters(adapterAddress);

  if (!isAuthorized) {
    throw new Error(
      `[bridge:send] adapter ${adapterAddress} is not authorized by core ${coreAddress}. ` +
        "Run your deployment/wiring flow before sending.",
    );
  }
}

async function assertLzRouteMatchesConfig(
  adapterAddress: string,
  dstEid: number,
  lzConfigPath: string,
  hre: HardhatRuntimeEnvironment,
  signer: Signer,
): Promise<void> {
  const graph = await loadGraph<LzOmniGraphHardhat>(lzConfigPath);
  const localNetwork = hre.network.name;
  const adapterNormalized = hre.ethers.utils
    .getAddress(adapterAddress)
    .toLowerCase();
  const candidateConnections = graph.connections.filter(
    (connection) =>
      connection.from.network === localNetwork && connection.to.eid === dstEid,
  );

  let matchedConnection: (typeof candidateConnections)[number] | undefined;

  for (const connection of candidateConnections) {
    const localAddress = (
      await resolvePointAddress(connection.from as LzPointHardhat, hre)
    ).toLowerCase();
    if (localAddress === adapterNormalized) {
      matchedConnection = connection;
      break;
    }
  }

  if (matchedConnection == null) {
    throw new Error(
      `[lz:send] no mesh route in ${lzConfigPath} for network=${localNetwork} adapter=${adapterAddress} dstEid=${dstEid}`,
    );
  }

  const remoteAddress = await resolvePointAddress(
    matchedConnection.to as LzPointHardhat,
    hre,
  );
  const expectedPeer = hre.ethers.utils
    .hexZeroPad(remoteAddress, 32)
    .toLowerCase();
  const adapter = new Contract(
    adapterAddress,
    ["function peers(uint32 eid) view returns (bytes32 peer)"],
    signer,
  );
  const currentPeer = (await adapter.peers(dstEid)).toLowerCase();

  if (currentPeer !== expectedPeer) {
    throw new Error(
      `[lz:send] peer mismatch for adapter=${adapterAddress} dstEid=${dstEid}. ` +
        `expected=${expectedPeer} configured=${currentPeer}. ` +
        `Run \"npx hardhat lz:wire --network ${localNetwork} --lz-config ${lzConfigPath}\".`,
    );
  }
}

async function assertCcipRouteMatchesConfig(
  adapterAddress: string,
  dstChainSelector: string,
  ccipConfigPath: string,
  hre: HardhatRuntimeEnvironment,
  signer: Signer,
): Promise<void> {
  const graph = await loadGraph<CcipOmniGraphHardhat>(ccipConfigPath);
  const localNetwork = hre.network.name;
  const adapterNormalized = hre.ethers.utils
    .getAddress(adapterAddress)
    .toLowerCase();
  const normalizedDestinationSelector =
    normalizeChainSelector(dstChainSelector);
  const destinationSelectorBigInt = BigInt(normalizedDestinationSelector);

  if (destinationSelectorBigInt > 2n ** 64n - 1n) {
    throw new Error(
      `Chain selector ${normalizedDestinationSelector} exceeds uint64 range`,
    );
  }

  const candidateConnections = graph.connections.filter(
    (connection) =>
      connection.from.network === localNetwork &&
      normalizeChainSelector(connection.to.chainSelector) ===
        normalizedDestinationSelector,
  );

  let matchedConnection: (typeof candidateConnections)[number] | undefined;

  for (const connection of candidateConnections) {
    const localAddress = (
      await resolvePointAddress(connection.from as CcipPointHardhat, hre)
    ).toLowerCase();
    if (localAddress === adapterNormalized) {
      matchedConnection = connection;
      break;
    }
  }

  if (matchedConnection == null) {
    throw new Error(
      `[ccip:send] no mesh route in ${ccipConfigPath} for network=${localNetwork} adapter=${adapterAddress} ` +
        `dstChainSelector=${normalizedDestinationSelector}`,
    );
  }

  const remoteAddress = await resolvePointAddress(
    matchedConnection.to as CcipPointHardhat,
    hre,
  );
  const expectedPeer = hre.ethers.utils.defaultAbiCoder.encode(
    ["address"],
    [hre.ethers.utils.getAddress(remoteAddress)],
  );
  const adapter = new Contract(
    adapterAddress,
    ["function ccipPeers(uint64 chainSelector) view returns (bytes peer)"],
    signer,
  );
  const currentPeer = hre.ethers.utils
    .hexlify(await adapter.ccipPeers(normalizedDestinationSelector))
    .toLowerCase();
  const normalizedExpectedPeer = hre.ethers.utils
    .hexlify(expectedPeer)
    .toLowerCase();

  if (currentPeer !== normalizedExpectedPeer) {
    throw new Error(
      `[ccip:send] peer mismatch for adapter=${adapterAddress} dstChainSelector=${normalizedDestinationSelector}. ` +
        `expected=${normalizedExpectedPeer} configured=${currentPeer}. ` +
        `Run \"npx hardhat ccip:wire --network ${localNetwork} --ccip-config ${ccipConfigPath}\".`,
    );
  }
}

function findEventArg(
  receipt: ContractReceipt,
  eventName: string,
  argName: string,
): string | undefined {
  const event = receipt.events?.find(
    (candidate) => candidate.event === eventName,
  );
  const args = event?.args as Record<string, unknown> | undefined;
  const value = args?.[argName];
  return typeof value === "string" ? value : undefined;
}

task("lz:send", "Sends a bridge transfer through Token6022BridgeAdapterLZ")
  .addParam("dstEid", "Destination LayerZero endpoint id", undefined, types.int)
  .addParam(
    "to",
    "Recipient address on destination chain",
    undefined,
    types.string,
  )
  .addParam("amount", "Token amount in human units", undefined, types.string)
  .addOptionalParam(
    "adapter",
    "Adapter deployment name or address",
    "Token6022BridgeAdapterLZ",
    types.string,
  )
  .addOptionalParam(
    "options",
    "LayerZero options as hex bytes (0x uses stored defaults)",
    "0x",
    types.string,
  )
  .addOptionalParam(
    "transferId",
    "Custom transfer id (bytes32 or shorter hex)",
    undefined,
    types.string,
  )
  .addOptionalParam(
    "lzConfig",
    "Path to LayerZero config file",
    "layerzero.testnet.config.ts",
    types.string,
  )
  .setAction(async (args: LzSendArgs, hre: HardhatRuntimeEnvironment) => {
    const signer = (await hre.ethers.getSigners())[0];
    if (signer == null) {
      throw new Error("No signer available for this network");
    }

    const adapterAddress = await resolveAdapterAddress(args.adapter, hre);
    const adapter = await hre.ethers.getContractAt(
      "Token6022BridgeAdapterLZ",
      adapterAddress,
      signer,
    );
    const coreAddress = hre.ethers.utils.getAddress(await adapter.core());
    const transferId = resolveTransferId(args.transferId, hre);
    await assertAdapterAuthorized(coreAddress, adapterAddress, signer);

    await assertLzRouteMatchesConfig(
      adapterAddress,
      args.dstEid,
      args.lzConfig,
      hre,
      signer,
    );

    const { amountLD, decimals, canonicalToken } =
      await resolveAmountAndApproveIfNeeded(
        coreAddress,
        args.amount,
        signer.address,
        hre,
      );

    const quotedFee = await adapter.quoteLzSend(
      args.dstEid,
      args.to,
      amountLD,
      transferId,
      args.options,
      false,
    );
    const nativeFee: BigNumber = quotedFee.nativeFee ?? quotedFee[0];

    console.log(`\n🌉 LayerZero Bridge Send`);
    console.log(`🌐 Network: ${hre.network.name}`);
    console.log(`🔀 Adapter: ${adapterAddress}`);
    console.log(`🔗 Core: ${coreAddress}`);
    console.log(`🎯 Destination EID: ${args.dstEid}`);
    console.log(`👤 Recipient: ${args.to}`);
    console.log(`💰 Amount: ${args.amount} (${decimals} decimals)`);
    console.log(`🔑 Transfer ID: ${transferId}`);
    console.log(`💸 Native Fee: ${nativeFee.toString()}`);
    if (canonicalToken != null) {
      console.log(`📦 Core Type: canonical`);
      console.log(`🪙 Token: ${canonicalToken}`);
    } else {
      console.log(`📦 Core Type: satellite`);
    }

    console.log(`\n🚀 Sending bridge transaction...`);
    const tx = await adapter.sendWithLz(
      args.dstEid,
      args.to,
      amountLD,
      transferId,
      args.options,
      {
        value: nativeFee,
      },
    );
    const receipt = await tx.wait();
    const guid = findEventArg(receipt, "LzSend", "guid");

    console.log(`\n✅ Bridge transaction sent successfully!`);
    console.log(`📝 Tx: ${tx.hash}`);
    if (guid != null) {
      console.log(`🆔 GUID: ${guid}`);
    }
  });

task("ccip:send", "Sends a bridge transfer through Token6022BridgeAdapterCCIP")
  .addParam(
    "dstChainSelector",
    "Destination CCIP chain selector",
    undefined,
    types.string,
  )
  .addParam(
    "to",
    "Recipient address on destination chain",
    undefined,
    types.string,
  )
  .addParam("amount", "Token amount in human units", undefined, types.string)
  .addOptionalParam(
    "adapter",
    "Adapter deployment name or address",
    "Token6022BridgeAdapterCCIP",
    types.string,
  )
  .addOptionalParam(
    "transferId",
    "Custom transfer id (bytes32 or shorter hex)",
    undefined,
    types.string,
  )
  .addOptionalParam(
    "ccipConfig",
    "Path to CCIP config file",
    "ccip.testnet.config.ts",
    types.string,
  )
  .setAction(async (args: CcipSendArgs, hre: HardhatRuntimeEnvironment) => {
    const signer = (await hre.ethers.getSigners())[0];
    if (signer == null) {
      throw new Error("No signer available for this network");
    }

    const adapterAddress = await resolveAdapterAddress(args.adapter, hre);
    const adapter = await hre.ethers.getContractAt(
      "Token6022BridgeAdapterCCIP",
      adapterAddress,
      signer,
    );
    const coreAddress = hre.ethers.utils.getAddress(await adapter.core());
    const transferId = resolveTransferId(args.transferId, hre);
    await assertAdapterAuthorized(coreAddress, adapterAddress, signer);

    await assertCcipRouteMatchesConfig(
      adapterAddress,
      args.dstChainSelector,
      args.ccipConfig,
      hre,
      signer,
    );

    const { amountLD, decimals, canonicalToken } =
      await resolveAmountAndApproveIfNeeded(
        coreAddress,
        args.amount,
        signer.address,
        hre,
      );

    const quotedFee: BigNumber = await adapter.quoteCcipSend(
      args.dstChainSelector,
      args.to,
      amountLD,
      transferId,
    );

    console.log(`\n🌉 CCIP Bridge Send`);
    console.log(`🌐 Network: ${hre.network.name}`);
    console.log(`🔀 Adapter: ${adapterAddress}`);
    console.log(`🔗 Core: ${coreAddress}`);
    console.log(`🎯 Destination Chain Selector: ${args.dstChainSelector}`);
    console.log(`👤 Recipient: ${args.to}`);
    console.log(`💰 Amount: ${args.amount} (${decimals} decimals)`);
    console.log(`🔑 Transfer ID: ${transferId}`);
    console.log(`💸 Native Fee: ${quotedFee.toString()}`);
    if (canonicalToken != null) {
      console.log(`📦 Core Type: canonical`);
      console.log(`🪙 Token: ${canonicalToken}`);
    } else {
      console.log(`📦 Core Type: satellite`);
    }

    console.log(`\n🚀 Sending bridge transaction...`);
    const tx = await adapter.sendWithCcip(
      args.dstChainSelector,
      args.to,
      amountLD,
      transferId,
      {
        value: quotedFee,
      },
    );
    const receipt = await tx.wait();
    const messageId = findEventArg(receipt, "CcipSend", "messageId");

    console.log(`\n✅ Bridge transaction sent successfully!`);
    console.log(`📝 Tx: ${tx.hash}`);
    if (messageId != null) {
      console.log(`🆔 Message ID: ${messageId}`);
    }
  });
