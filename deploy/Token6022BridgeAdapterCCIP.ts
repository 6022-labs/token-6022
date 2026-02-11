import assert from "assert";

import { type DeployFunction } from "hardhat-deploy/types";
import { resolveBridgeCoreName } from "./utils/resolve-bridge-core";

const contractName = "Token6022BridgeAdapterCCIP";

const deploy: DeployFunction = async (hre) => {
  const { getNamedAccounts, deployments } = hre;
  const { deploy, read, execute } = deployments;
  const { deployer } = await getNamedAccounts();

  assert(deployer, "Missing named deployer account");
  const deployerAddress = hre.ethers.utils.getAddress(deployer);

  const ccipRouter = hre.network.config.bridgeAdapters?.ccip?.router;
  if (ccipRouter == null) {
    return;
  }

  const coreName = await resolveBridgeCoreName(hre, contractName);

  const coreDeployment = await deployments.get(coreName);

  const { address } = await deploy(contractName, {
    from: deployer,
    args: [coreDeployment.address, ccipRouter],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const isAuthorized = await read(coreName, "adapters", address);
  if (!isAuthorized) {
    const coreOwner = hre.ethers.utils.getAddress(await read(coreName, "owner"));
    if (coreOwner.toLowerCase() === deployerAddress.toLowerCase()) {
      await execute(
        coreName,
        { from: deployer, log: true },
        "setAdapter",
        address,
        true,
      );
    } else {
      console.warn(
        `[${contractName}] adapter ${address} was not auto-authorized because core owner (${coreOwner}) is not deployer (${deployerAddress}). ` +
          `Authorize it from the core owner by calling ${coreName}.setAdapter(${address}, true).`,
      );
    }
  }

  console.log(`Deployed ${contractName} on ${hre.network.name}: ${address}`);
};

deploy.tags = [contractName, "BridgeAdapter"];

deploy.dependencies = ["Token6022BridgeCoreCanonical", "Token6022BridgeCoreSatellite"];

export default deploy;
