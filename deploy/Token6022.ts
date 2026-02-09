import assert from "assert";
import { ethers } from "hardhat";

import { type DeployFunction } from "hardhat-deploy/types";

const contractName = "Token6022";

const initialSupply = ethers.utils.parseUnits("1000000000", 18);

const deploy: DeployFunction = async (hre) => {
  const { getNamedAccounts, deployments } = hre;

  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  assert(deployer, "Missing named deployer account");

  console.log(`Network: ${hre.network.name}`);
  console.log(`Deployer: ${deployer}`);

  // Skip deployment if canonical token already exists and is configured.
  if (
    hre.network.config.bridgeCore?.type === "canonical" &&
    hre.network.config.bridgeCore.tokenAddress != null
  ) {
    console.warn(
      `6022 token already deployed on this network, skipping deployment`,
    );
    console.warn(
      `Token address: ${hre.network.config.bridgeCore.tokenAddress}`,
    );

    return;
  }

  const { address } = await deploy(contractName, {
    from: deployer,
    args: [
      deployer, // owner
      initialSupply, // initial supply
    ],
    log: true,
    skipIfAlreadyDeployed: true,
    waitConfirmations: 1,
  });

  console.log(
    `Deployed contract: ${contractName}, network: ${hre.network.name}, address: ${address}`,
  );
};

deploy.tags = [contractName];

export default deploy;
