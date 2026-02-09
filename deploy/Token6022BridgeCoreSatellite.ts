import assert from "assert";

import { type DeployFunction } from "hardhat-deploy/types";

const contractName = "Token6022BridgeCoreSatellite";

const deploy: DeployFunction = async (hre) => {
  const { getNamedAccounts, deployments } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  assert(deployer, "Missing named deployer account");

  const bridgeCoreConfig = hre.network.config.bridgeCore;
  if (bridgeCoreConfig?.type !== "satellite") {
    return;
  }

  const { address } = await deploy(contractName, {
    from: deployer,
    args: ["6022", "6022", deployer],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  console.log(`Deployed ${contractName} on ${hre.network.name}: ${address}`);
};

deploy.tags = [contractName, "BridgeCore"];

export default deploy;
