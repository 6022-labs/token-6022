import { type DeployFunction } from "hardhat-deploy/types";

type BridgeCoreName =
  | "Token6022BridgeCoreCanonical"
  | "Token6022BridgeCoreSatellite";

function expectedCoreNameFromType(
  type: "canonical" | "satellite",
): BridgeCoreName {
  return type === "canonical"
    ? "Token6022BridgeCoreCanonical"
    : "Token6022BridgeCoreSatellite";
}

function otherCoreName(coreName: BridgeCoreName): BridgeCoreName {
  return coreName === "Token6022BridgeCoreCanonical"
    ? "Token6022BridgeCoreSatellite"
    : "Token6022BridgeCoreCanonical";
}

export async function resolveBridgeCoreName(
  hre: Parameters<DeployFunction>[0],
  adapterContractName: string,
): Promise<BridgeCoreName> {
  const bridgeCoreType = hre.network.config.bridgeCore?.type;
  if (bridgeCoreType == null) {
    throw new Error(
      `[${adapterContractName}] missing network config bridgeCore.type on ${hre.network.name}`,
    );
  }

  const expectedCoreName = expectedCoreNameFromType(bridgeCoreType);
  const unexpectedCoreName = otherCoreName(expectedCoreName);
  const expectedCore = await hre.deployments.getOrNull(expectedCoreName);
  const unexpectedCore = await hre.deployments.getOrNull(unexpectedCoreName);

  if (expectedCore == null) {
    throw new Error(
      `[${adapterContractName}] expected ${expectedCoreName} deployment on ${hre.network.name} (bridgeCore.type=${bridgeCoreType}) but none was found`,
    );
  }

  if (unexpectedCore != null) {
    throw new Error(
      `[${adapterContractName}] ambiguous bridge core deployments on ${hre.network.name}: found both ${expectedCoreName} and ${unexpectedCoreName}. ` +
        `Remove stale deployment files before deploying adapters.`,
    );
  }

  return expectedCoreName;
}
