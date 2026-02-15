import fs from "fs/promises";
import path from "path";

import { BigNumber, Contract, Signer } from "ethers";
import { task, types } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import {
  CcipOmniGraphHardhat,
  CcipPointHardhat,
  normalizeChainSelector,
} from "./ccip-config";
import { LzOmniGraphHardhat, LzPointHardhat } from "./lz-config";

interface BridgeDiagnosticsArgs {
  to: string;
  amount: string;
  transferId?: string;
  protocol: string;
  lzConfig: string;
  ccipConfig: string;
}

interface MeshPoint {
  network: string;
  contractName?: string;
  address?: string;
}

interface CoreAssetInfo {
  amountLD: BigNumber;
  decimals: number;
  coreAddress: string;
}

const LZ_DIAGNOSTICS_ABI = [
  "function core() view returns (address)",
  "function peers(uint32 eid) view returns (bytes32 peer)",
  "function lzSendOptions(uint32 eid) view returns (bytes options)",
  "function quoteLzSend(uint32,address,uint256,bytes32,bytes,bool) view returns ((uint256 nativeFee, uint256 lzTokenFee))",
];

const CCIP_DIAGNOSTICS_ABI = [
  "function core() view returns (address)",
  "function ccipPeers(uint64 chainSelector) view returns (bytes peer)",
  "function ccipExtraArgs(uint64 chainSelector) view returns (bytes extraArgs)",
  "function quoteCcipSend(uint64,address,uint256,bytes32) view returns (uint256 fee)",
];

async function loadGraph<T>(configPath: string): Promise<T> {
  const loaded = (await import(path.resolve("./", configPath))).default;

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

function normalizeHexBytes(
  value: string,
  hre: HardhatRuntimeEnvironment,
): string {
  return hre.ethers.utils.hexlify(value).toLowerCase();
}

function formatError(error: unknown): string {
  if (
    typeof error === "object" &&
    error != null &&
    "reason" in error &&
    typeof (error as { reason?: unknown }).reason === "string"
  ) {
    return (error as { reason: string }).reason;
  }

  if (
    typeof error === "object" &&
    error != null &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return String(error);
}

async function resolveCoreAssetInfo(
  coreAddress: string,
  amount: string,
  signer: Signer,
  hre: HardhatRuntimeEnvironment,
): Promise<CoreAssetInfo> {
  const canonicalCore = new Contract(
    coreAddress,
    ["function token() view returns (address)"],
    signer,
  );

  let decimalsSourceAddress = coreAddress;

  try {
    const canonicalToken = hre.ethers.utils.getAddress(await canonicalCore.token());
    decimalsSourceAddress = canonicalToken;
  } catch {
    decimalsSourceAddress = coreAddress;
  }

  const asset = new Contract(
    decimalsSourceAddress,
    ["function decimals() view returns (uint8)"],
    signer,
  );

  const decimals = Number(await asset.decimals());
  const amountLD = hre.ethers.utils.parseUnits(amount, decimals);

  return {
    amountLD,
    decimals,
    coreAddress: hre.ethers.utils.getAddress(coreAddress),
  };
}

async function runLzDiagnostics(
  args: BridgeDiagnosticsArgs,
  hre: HardhatRuntimeEnvironment,
  signer: Signer,
  transferId: string,
): Promise<void> {
  const graph = await loadGraph<LzOmniGraphHardhat>(args.lzConfig);
  const localConnections = graph.connections.filter(
    (connection) => connection.from.network === hre.network.name,
  );

  if (localConnections.length === 0) {
    console.log(`\n⚠️  No local LayerZero routes found`);
    return;
  }

  console.log(`\n🧭 LayerZero diagnostics (${localConnections.length} routes)`);

  for (const connection of localConnections) {
    const localAddress = await resolvePointAddress(
      connection.from as LzPointHardhat,
      hre,
    );
    const remoteAddress = await resolvePointAddress(
      connection.to as LzPointHardhat,
      hre,
    );
    const adapter = new Contract(localAddress, LZ_DIAGNOSTICS_ABI, signer);
    const dstEid = connection.to.eid;
    const expectedPeer = hre.ethers.utils
      .hexZeroPad(remoteAddress, 32)
      .toLowerCase();
    const configuredPeer = (await adapter.peers(dstEid)).toLowerCase();
    const peerMatches = configuredPeer === expectedPeer;

    const configuredOptions = normalizeHexBytes(
      await adapter.lzSendOptions(dstEid),
      hre,
    );
    const expectedOptions =
      connection.fromOptions == null
        ? undefined
        : normalizeHexBytes(connection.fromOptions, hre);
    const optionsMatches =
      expectedOptions == null ? undefined : configuredOptions === expectedOptions;

    const coreAddress = hre.ethers.utils.getAddress(await adapter.core());
    const { amountLD, decimals } = await resolveCoreAssetInfo(
      coreAddress,
      args.amount,
      signer,
      hre,
    );

    let feeLabel = "quote failed";
    try {
      const feeQuote = await adapter.quoteLzSend(
        dstEid,
        args.to,
        amountLD,
        transferId,
        "0x",
        false,
      );
      const nativeFee: BigNumber = feeQuote.nativeFee ?? feeQuote[0];
      feeLabel = `${nativeFee.toString()} wei (${hre.ethers.utils.formatEther(nativeFee)} ETH)`;
    } catch (error) {
      feeLabel = `quote failed: ${formatError(error)}`;
    }

    console.log(`\n🔗 LZ ${hre.network.name} -> ${connection.to.network} (eid ${dstEid})`);
    console.log(`   Local adapter: ${localAddress}`);
    console.log(`   Core: ${coreAddress}`);
    console.log(`   Amount: ${args.amount} (${decimals} decimals)`);
    console.log(`   Peer match: ${peerMatches ? "yes" : "no"}`);
    console.log(`   Configured peer: ${configuredPeer}`);
    console.log(`   Expected peer:   ${expectedPeer}`);
    if (expectedOptions != null) {
      console.log(`   Options match: ${optionsMatches ? "yes" : "no"}`);
      console.log(`   Configured options: ${configuredOptions}`);
      console.log(`   Expected options:   ${expectedOptions}`);
    } else {
      console.log(`   Configured options: ${configuredOptions}`);
      console.log(`   Expected options:   (not set in config)`);
    }
    console.log(`   Live quote: ${feeLabel}`);
  }
}

async function runCcipDiagnostics(
  args: BridgeDiagnosticsArgs,
  hre: HardhatRuntimeEnvironment,
  signer: Signer,
  transferId: string,
): Promise<void> {
  const graph = await loadGraph<CcipOmniGraphHardhat>(args.ccipConfig);
  const localConnections = graph.connections.filter(
    (connection) => connection.from.network === hre.network.name,
  );

  if (localConnections.length === 0) {
    console.log(`\n⚠️  No local CCIP routes found`);
    return;
  }

  console.log(`\n🧭 CCIP diagnostics (${localConnections.length} routes)`);

  for (const connection of localConnections) {
    const localAddress = await resolvePointAddress(
      connection.from as CcipPointHardhat,
      hre,
    );
    const remoteAddress = await resolvePointAddress(
      connection.to as CcipPointHardhat,
      hre,
    );
    const adapter = new Contract(localAddress, CCIP_DIAGNOSTICS_ABI, signer);
    const dstSelector = normalizeChainSelector(connection.to.chainSelector);
    const expectedPeer = normalizeHexBytes(
      hre.ethers.utils.defaultAbiCoder.encode(
        ["address"],
        [hre.ethers.utils.getAddress(remoteAddress)],
      ),
      hre,
    );
    const configuredPeer = normalizeHexBytes(
      await adapter.ccipPeers(dstSelector),
      hre,
    );
    const peerMatches = configuredPeer === expectedPeer;

    const configuredExtraArgs = normalizeHexBytes(
      await adapter.ccipExtraArgs(dstSelector),
      hre,
    );
    const expectedExtraArgs =
      connection.fromExtraArgs == null
        ? undefined
        : normalizeHexBytes(connection.fromExtraArgs, hre);
    const extraArgsMatches =
      expectedExtraArgs == null
        ? undefined
        : configuredExtraArgs === expectedExtraArgs;

    const coreAddress = hre.ethers.utils.getAddress(await adapter.core());
    const { amountLD, decimals } = await resolveCoreAssetInfo(
      coreAddress,
      args.amount,
      signer,
      hre,
    );

    let feeLabel = "quote failed";
    try {
      const quotedFee: BigNumber = await adapter.quoteCcipSend(
        dstSelector,
        args.to,
        amountLD,
        transferId,
      );
      feeLabel = `${quotedFee.toString()} wei (${hre.ethers.utils.formatEther(quotedFee)} ETH)`;
    } catch (error) {
      feeLabel = `quote failed: ${formatError(error)}`;
    }

    console.log(
      `\n🔗 CCIP ${hre.network.name} -> ${connection.to.network} (selector ${dstSelector})`,
    );
    console.log(`   Local adapter: ${localAddress}`);
    console.log(`   Core: ${coreAddress}`);
    console.log(`   Amount: ${args.amount} (${decimals} decimals)`);
    console.log(`   Peer match: ${peerMatches ? "yes" : "no"}`);
    console.log(`   Configured peer: ${configuredPeer}`);
    console.log(`   Expected peer:   ${expectedPeer}`);
    if (expectedExtraArgs != null) {
      console.log(`   ExtraArgs match: ${extraArgsMatches ? "yes" : "no"}`);
      console.log(`   Configured extraArgs: ${configuredExtraArgs}`);
      console.log(`   Expected extraArgs:   ${expectedExtraArgs}`);
    } else {
      console.log(`   Configured extraArgs: ${configuredExtraArgs}`);
      console.log(`   Expected extraArgs:   (not set in config)`);
    }
    console.log(`   Live quote: ${feeLabel}`);
  }
}

task(
  "bridge:diagnostics",
  "Prints wiring state and live fee quotes for local LZ/CCIP routes",
)
  .addParam("to", "Recipient address for fee quote payload", undefined, types.string)
  .addOptionalParam("amount", "Token amount in human units", "1", types.string)
  .addOptionalParam(
    "protocol",
    "Which protocol to diagnose: all | lz | ccip",
    "all",
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
  .addOptionalParam(
    "ccipConfig",
    "Path to CCIP config file",
    "ccip.testnet.config.ts",
    types.string,
  )
  .setAction(async (args: BridgeDiagnosticsArgs, hre: HardhatRuntimeEnvironment) => {
    const signer = (await hre.ethers.getSigners())[0];
    if (signer == null) {
      throw new Error("No signer available for this network");
    }

    const protocol = args.protocol.toLowerCase();
    if (!["all", "lz", "ccip"].includes(protocol)) {
      throw new Error(
        `Invalid protocol "${args.protocol}". Expected one of: all, lz, ccip`,
      );
    }

    const recipient = hre.ethers.utils.getAddress(args.to);
    const transferId = resolveTransferId(args.transferId, hre);

    console.log(`\n🩺 Bridge diagnostics`);
    console.log(`🌐 Network: ${hre.network.name}`);
    console.log(`👤 Signer: ${await signer.getAddress()}`);
    console.log(`🎯 Recipient: ${recipient}`);
    console.log(`💰 Amount: ${args.amount}`);
    console.log(`🔑 Transfer ID: ${transferId}`);

    if (protocol === "all" || protocol === "lz") {
      await runLzDiagnostics({ ...args, to: recipient }, hre, signer, transferId);
    }

    if (protocol === "all" || protocol === "ccip") {
      await runCcipDiagnostics({ ...args, to: recipient }, hre, signer, transferId);
    }
  });
