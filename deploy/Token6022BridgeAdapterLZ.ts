import assert from "assert";

import { type DeployFunction } from "hardhat-deploy/types";

const contractName = "Token6022BridgeAdapterLZ";

async function resolveCoreName(
  hre: Parameters<DeployFunction>[0],
): Promise<string | null> {
  const canonical = await hre.deployments.getOrNull("Token6022BridgeCoreCanonical");
  if (canonical != null) {
    return "Token6022BridgeCoreCanonical";
  }

  const satellite = await hre.deployments.getOrNull("Token6022BridgeCoreSatellite");
  if (satellite != null) {
    return "Token6022BridgeCoreSatellite";
  }

  return null;
}

const deploy: DeployFunction = async (hre) => {
  const { getNamedAccounts, deployments } = hre;
  const { deploy, read, execute } = deployments;
  const { deployer } = await getNamedAccounts();

  assert(deployer, "Missing named deployer account");

  let lzEndpoint = hre.network.config.bridgeAdapters?.lz?.endpoint;
  if (lzEndpoint == null) {
    const endpointV2 = await deployments.getOrNull("EndpointV2");
    lzEndpoint = endpointV2?.address;
  }

  if (lzEndpoint == null) {
    return;
  }

  const coreName = await resolveCoreName(hre);
  if (coreName == null) {
    console.warn(
      `[${contractName}] no BridgeCore deployed on ${hre.network.name}, skipping deployment`,
    );
    return;
  }

  const coreDeployment = await deployments.get(coreName);

  const { address } = await deploy(contractName, {
    from: deployer,
    args: [coreDeployment.address, lzEndpoint, deployer],
    log: true,
    skipIfAlreadyDeployed: true,
  });

  const isAuthorized = await read(coreName, "adapters", address);
  if (!isAuthorized) {
    await execute(
      coreName,
      { from: deployer, log: true },
      "setAdapter",
      address,
      true,
    );
  }

  console.log(`Deployed ${contractName} on ${hre.network.name}: ${address}`);
};

deploy.tags = [contractName, "BridgeAdapter"];

deploy.dependencies = ["Token6022BridgeCoreCanonical", "Token6022BridgeCoreSatellite"];

export default deploy;
