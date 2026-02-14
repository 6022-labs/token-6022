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

  console.log(`\n🌐 Network: ${hre.network.name}`);
  console.log(`👤 Deployer: ${deployer}`);

  // Skip deployment if canonical token already exists and is configured.
  if (
    hre.network.config.bridgeCore?.type === "canonical" &&
    hre.network.config.bridgeCore.tokenAddress != null
  ) {
    console.log(
      `\n⏭️  Skipping ${contractName} deployment - canonical token already configured`,
    );
    console.log(
      `📍 Token address: ${hre.network.config.bridgeCore.tokenAddress}`,
    );

    return;
  }

  console.log(`\n🚀 Deploying ${contractName}...`);
  console.log(`   Initial supply: ${ethers.utils.formatUnits(initialSupply, 18)} tokens`);

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

  console.log(`\n✅ ${contractName} deployed successfully!`);
  console.log(`📍 Address: ${address}`);
  console.log(`🌐 Network: ${hre.network.name}`);
};

deploy.tags = [contractName];

export default deploy;
