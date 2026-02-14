import assert from "assert";

import { type DeployFunction } from "hardhat-deploy/types";
import { resolveBridgeCoreName } from "./utils/resolve-bridge-core";

const contractName = "Token6022BridgeAdapterLZ";

const deploy: DeployFunction = async (hre) => {
  const { getNamedAccounts, deployments } = hre;
  const { deploy, read, execute } = deployments;
  const { deployer } = await getNamedAccounts();

  assert(deployer, "Missing named deployer account");
  const deployerAddress = hre.ethers.utils.getAddress(deployer);

  let lzEndpoint = hre.network.config.bridgeAdapters?.lz?.endpoint;
  if (lzEndpoint == null) {
    const endpointV2 = await deployments.getOrNull("EndpointV2");
    lzEndpoint = endpointV2?.address;
  }

  if (lzEndpoint == null) {
    console.log(
      `\n⏭️  Skipping ${contractName} - LayerZero endpoint not configured`,
    );
    return;
  }

  const coreName = await resolveBridgeCoreName(hre, contractName);

  console.log(`\n🚀 Deploying ${contractName}...`);
  console.log(`🌐 Network: ${hre.network.name}`);
  console.log(`🔗 Bridge Core: ${coreName}`);

  const coreDeployment = await deployments.get(coreName);

  console.log(`📍 Core address: ${coreDeployment.address}`);
  console.log(`📡 LayerZero endpoint: ${lzEndpoint}`);
  console.log(`🔧 EID: ${hre.network.config.eid}`);

  const { address } = await deploy(contractName, {
    from: deployer,
    args: [coreDeployment.address, lzEndpoint],
    log: true,
    skipIfAlreadyDeployed: true,
    waitConfirmations: 2,
  });

  console.log(`\n🔐 Checking adapter authorization...`);
  const isAuthorized = await read(coreName, "adapters", address);
  if (!isAuthorized) {
    const coreOwner = hre.ethers.utils.getAddress(
      await read(coreName, "owner"),
    );
    if (coreOwner.toLowerCase() === deployerAddress.toLowerCase()) {
      console.log(`🔓 Auto-authorizing adapter on core...`);
      await execute(
        coreName,
        { from: deployer, log: true, waitConfirmations: 2 },
        "setAdapter",
        address,
        true,
      );
      console.log(`✅ Adapter authorized!`);
    } else {
      console.warn(
        `\n⚠️  Adapter ${address} NOT auto-authorized!\n` +
          `   Core owner (${coreOwner}) != deployer (${deployerAddress})\n` +
          `   ⚡ Manual action required: call ${coreName}.setAdapter(${address}, true)`,
      );
    }
  } else {
    console.log(`✅ Adapter already authorized`);
  }

  console.log(`\n✅ ${contractName} deployed successfully!`);
  console.log(`📍 Adapter address: ${address}`);
};

deploy.tags = [contractName, "BridgeAdapter"];

deploy.dependencies = [
  "Token6022BridgeCoreCanonical",
  "Token6022BridgeCoreSatellite",
];

export default deploy;
