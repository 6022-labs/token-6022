import assert from "assert";

import { type DeployFunction } from "hardhat-deploy/types";
import { resolveBridgeOwner } from "./utils/bridge-governance";

const contractName = "Token6022BridgeCoreCanonical";

const deploy: DeployFunction = async (hre) => {
  const { getNamedAccounts, deployments } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  assert(deployer, "Missing named deployer account");
  const owner = resolveBridgeOwner(hre, deployer);

  const bridgeCoreConfig = hre.network.config.bridgeCore;
  if (bridgeCoreConfig?.type !== "canonical") {
    console.log(
      `\n⏭️  Skipping ${contractName} - network is not canonical chain`,
    );
    return;
  }

  const tokenAddress = bridgeCoreConfig.tokenAddress;
  if (tokenAddress == null) {
    console.warn(
      `\n⚠️  [${contractName}] tokenAddress missing in bridgeCore config, skipping deployment`,
    );
    return;
  }

  console.log(`\n🚀 Deploying ${contractName}...`);
  console.log(`🌐 Network: ${hre.network.name}`);
  console.log(`🪙  Token: ${tokenAddress}`);
  console.log(`👤 Owner: ${owner}`);

  const { address } = await deploy(contractName, {
    from: deployer,
    args: [tokenAddress, owner],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  console.log(`\n✅ ${contractName} deployed successfully!`);
  console.log(`📍 Core address: ${address}`);
  console.log(`🔒 Locks/releases from: ${tokenAddress}`);
};

deploy.tags = [contractName, "BridgeCore"];

export default deploy;
