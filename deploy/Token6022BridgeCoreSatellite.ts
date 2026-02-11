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
    return;
  }

  const { address } = await deploy(contractName, {
    from: deployer,
    args: ["6022", "6022", owner],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  console.log(
    `Deployed ${contractName} on ${hre.network.name}: ${address} (owner=${owner})`,
  );
};

deploy.tags = [contractName, "BridgeCore"];

export default deploy;
