import assert from "assert";

import { type DeployFunction } from "hardhat-deploy/types";
import { resolveBridgeOwner } from "./utils/bridge-governance";

const contractName = "Token6022BridgeCoreSatellite";

const deploy: DeployFunction = async (hre) => {
  const { getNamedAccounts, deployments } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  assert(deployer, "Missing named deployer account");
  const owner = resolveBridgeOwner(hre, deployer);

  const bridgeCoreConfig = hre.network.config.bridgeCore;
  if (bridgeCoreConfig?.type !== "satellite") {
    console.log(
      `\n⏭️  Skipping ${contractName} - network is not satellite chain`,
    );
    return;
  }

  console.log(`\n🚀 Deploying ${contractName}...`);
  console.log(`🌐 Network: ${hre.network.name}`);
  console.log(`🪙  Token name/symbol: 6022/6022`);
  console.log(`👤 Owner: ${owner}`);
  console.log(
    `💡 Note: This contract IS the ERC20 token (mints/burns on bridge)`,
  );

  const { address } = await deploy(contractName, {
    from: deployer,
    args: ["6022", "6022", owner],
    log: true,
    skipIfAlreadyDeployed: true,
    waitConfirmations: 2,
  });

  console.log(`\n✅ ${contractName} deployed successfully!`);
  console.log(`📍 Core/Token address: ${address}`);
  console.log(`🔥 Mints on inbound, burns on outbound`);
};

deploy.tags = [contractName, "BridgeCore"];

export default deploy;
