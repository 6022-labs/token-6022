import "dotenv/config";

import "hardhat-deploy";
import "@typechain/hardhat";
import "hardhat-contract-sizer";
import "@nomiclabs/hardhat-ethers";
import "@layerzerolabs/toolbox-hardhat";
import "@nomicfoundation/hardhat-chai-matchers";
import { HardhatUserConfig } from "hardhat/types";

import { EndpointId } from "@layerzerolabs/lz-definitions";

import "./type-extensions";
import "./tasks/ccip-wire";
import "./tasks/bridge-send";
import "./tasks/lz-wire";

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CCIP_ROUTER_AMOY_TESTNET = process.env.CCIP_ROUTER_AMOY_TESTNET;
const CCIP_ROUTER_BASE_TESTNET = process.env.CCIP_ROUTER_BASE_TESTNET;
const CCIP_ROUTER_CITREA_TESTNET = process.env.CCIP_ROUTER_CITREA_TESTNET;
const CCIP_CHAIN_SELECTOR_AMOY_TESTNET =
  process.env.CCIP_CHAIN_SELECTOR_AMOY_TESTNET ?? "16281711391670634445";
const CCIP_CHAIN_SELECTOR_BASE_TESTNET =
  process.env.CCIP_CHAIN_SELECTOR_BASE_TESTNET ?? "10344971235874465080";
const CCIP_CHAIN_SELECTOR_CITREA_TESTNET =
  process.env.CCIP_CHAIN_SELECTOR_CITREA_TESTNET;
const BRIDGE_OWNER_AMOY_TESTNET = process.env.BRIDGE_OWNER_AMOY_TESTNET;
const BRIDGE_OWNER_BASE_TESTNET = process.env.BRIDGE_OWNER_BASE_TESTNET;
const BRIDGE_OWNER_CITREA_TESTNET = process.env.BRIDGE_OWNER_CITREA_TESTNET;

const account: string = PRIVATE_KEY ?? "";

if (account == "") {
  console.warn(
    "Could not find PRIVATE_KEY environment variables. It will not be possible to execute transactions in your example.",
  );
}

const config: HardhatUserConfig = {
  paths: {
    cache: "cache/hardhat",
  },
  solidity: {
    compilers: [
      {
        version: "0.8.22",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    "amoy-testnet": {
      eid: EndpointId.AMOY_V2_TESTNET,
      ccipChainSelector: CCIP_CHAIN_SELECTOR_AMOY_TESTNET,
      url:
        process.env.RPC_URL_AMOY_TESTNET ||
        "https://rpc-amoy.polygon.technology",
      accounts: [account],
      bridgeCore: {
        type: "canonical",
        tokenAddress: "0x26adaf578361953e8F1aC86D3e4Ca153493af5cB",
      },
      bridgeAdapters: {
        lz: {},
        ...(CCIP_ROUTER_AMOY_TESTNET
          ? {
              ccip: {
                router: CCIP_ROUTER_AMOY_TESTNET,
              },
            }
          : {}),
      },
      ...(BRIDGE_OWNER_AMOY_TESTNET
        ? {
            bridgeGovernance: {
              owner: BRIDGE_OWNER_AMOY_TESTNET,
            },
          }
        : {}),
    },
    "base-testnet": {
      eid: EndpointId.BASESEP_V2_TESTNET,
      ccipChainSelector: CCIP_CHAIN_SELECTOR_BASE_TESTNET,
      url: process.env.RPC_URL_BASE_TESTNET || "https://sepolia.base.org",
      accounts: [account],
      bridgeCore: {
        type: "satellite",
      },
      bridgeAdapters: {
        lz: {},
        ...(CCIP_ROUTER_BASE_TESTNET
          ? {
              ccip: {
                router: CCIP_ROUTER_BASE_TESTNET,
              },
            }
          : {}),
      },
      ...(BRIDGE_OWNER_BASE_TESTNET
        ? {
            bridgeGovernance: {
              owner: BRIDGE_OWNER_BASE_TESTNET,
            },
          }
        : {}),
    },
    "citrea-testnet": {
      eid: EndpointId.CITREA_V2_TESTNET,
      url:
        process.env.RPC_URL_CITREA_TESTNET || "https://rpc.testnet.citrea.xyz",
      accounts: [account],
      ...(CCIP_CHAIN_SELECTOR_CITREA_TESTNET
        ? { ccipChainSelector: CCIP_CHAIN_SELECTOR_CITREA_TESTNET }
        : {}),
      bridgeCore: {
        type: "satellite",
      },
      bridgeAdapters: {
        lz: {},
        ...(CCIP_ROUTER_CITREA_TESTNET
          ? {
              ccip: {
                router: CCIP_ROUTER_CITREA_TESTNET,
              },
            }
          : {}),
      },
      ...(BRIDGE_OWNER_CITREA_TESTNET
        ? {
            bridgeGovernance: {
              owner: BRIDGE_OWNER_CITREA_TESTNET,
            },
          }
        : {}),
    },
    hardhat: {
      allowUnlimitedContractSize: true,
    },
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
};

export default config;
