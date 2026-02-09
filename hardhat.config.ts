import "dotenv/config";

import "hardhat-deploy";
import "@typechain/hardhat";
import "hardhat-contract-sizer";
import "@nomiclabs/hardhat-ethers";
import "@layerzerolabs/toolbox-hardhat";
import "@nomicfoundation/hardhat-chai-matchers";
import {
  HardhatUserConfig,
} from "hardhat/types";

import { EndpointId } from "@layerzerolabs/lz-definitions";

import "./type-extensions";
import './tasks/sendOFT';

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CCIP_ROUTER_AMOY_TESTNET = process.env.CCIP_ROUTER_AMOY_TESTNET;
const CCIP_ROUTER_BASE_TESTNET = process.env.CCIP_ROUTER_BASE_TESTNET;

const account: string = PRIVATE_KEY ?? "";

if (account == "") {
  console.warn(
    "Could not find PRIVATE_KEY environment variables. It will not be possible to execute transactions in your example."
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
      url:
        process.env.RPC_URL_AMOY_TESTNET ||
        "https://rpc-amoy.polygon.technology",
      accounts: [account],
      ...(CCIP_ROUTER_AMOY_TESTNET
        ? {
            ccipRouter: CCIP_ROUTER_AMOY_TESTNET,
          }
        : {}),
      oftAdapter: {
        tokenAddress: "0x26adaf578361953e8F1aC86D3e4Ca153493af5cB",
      },
    },
    "base-testnet": {
      eid: EndpointId.BASESEP_V2_TESTNET,
      url: process.env.RPC_URL_BASE_TESTNET || "https://sepolia.base.org",
      accounts: [account],
      ...(CCIP_ROUTER_BASE_TESTNET
        ? {
            ccipRouter: CCIP_ROUTER_BASE_TESTNET,
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
