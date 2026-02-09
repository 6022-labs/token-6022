import assert from 'assert'

import { type DeployFunction } from 'hardhat-deploy/types'

const contractName = 'Token6022BridgeAdapter'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre

    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    assert(deployer, 'Missing named deployer account')

    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

    // For this to work correctly, your network config must define an eid property
    // set to `EndpointId` as defined in @layerzerolabs/lz-definitions
    //
    // For example:
    //
    // networks: {
    //   fuji: {
    //     ...
    //     eid: EndpointId.AVALANCHE_V2_TESTNET
    //   }
    // }
    const endpointV2Deployment = await hre.deployments.get('EndpointV2')

    // The token address must be defined in hardhat.config.ts
    // If the token address is not defined, the deployment will log a warning and skip the deployment
    if (hre.network.config.oftAdapter?.tokenAddress == null) {
        console.warn(`token address not defined in hardhat.config.ts, skipping deployment`)

        return
    }

    if (hre.network.config.ccipRouter == null) {
        console.warn(`ccipRouter not defined in hardhat.config.ts, skipping deployment`)

        return
    }

    const { address } = await deploy(contractName, {
        from: deployer,
        args: [
            hre.network.config.oftAdapter.tokenAddress,
            endpointV2Deployment.address,
            hre.network.config.ccipRouter,
            deployer,
        ],
        log: true,
        skipIfAlreadyDeployed: true,
    })

    console.log(`Deployed contract: ${contractName}, network: ${hre.network.name}, address: ${address}`)
}

deploy.tags = [contractName]

export default deploy
