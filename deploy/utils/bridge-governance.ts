import { HardhatRuntimeEnvironment } from "hardhat/types";

export function resolveBridgeOwner(
  hre: HardhatRuntimeEnvironment,
  deployer: string,
): string {
  const configuredOwner = hre.network.config.bridgeGovernance?.owner;
  const owner = configuredOwner ?? deployer;

  if (!hre.ethers.utils.isAddress(owner)) {
    throw new Error(
      `[bridge-governance] invalid owner address "${owner}" on network ${hre.network.name}`,
    );
  }

  return hre.ethers.utils.getAddress(owner);
}
