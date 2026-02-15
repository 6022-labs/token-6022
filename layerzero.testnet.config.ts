import { EndpointId } from "@layerzerolabs/lz-definitions";
import { Options } from "@layerzerolabs/lz-v2-utilities";

import {
  LzPointHardhat,
  LzTwoWayConfig,
  LzOmniGraphHardhat,
  generateLzConnectionsConfig,
} from "./tasks/lz-config";

const baseTestnetContract: LzPointHardhat = {
  network: "base-testnet",
  eid: EndpointId.BASESEP_V2_TESTNET,
  contractName: "Token6022BridgeAdapterLZ",
};

const amoyTestnetContract: LzPointHardhat = {
  network: "amoy-testnet",
  eid: EndpointId.AMOY_V2_TESTNET,
  contractName: "Token6022BridgeAdapterLZ",
};

const citreaTestnetContract: LzPointHardhat = {
  network: "citrea-testnet",
  eid: EndpointId.CITREA_V2_TESTNET,
  contractName: "Token6022BridgeAdapterLZ",
};

const DEFAULT_LZ_OPTIONS = Options.newOptions()
  .addExecutorLzReceiveOption(200000, 0)
  .toHex()
  .toString();

const pathways: LzTwoWayConfig[] = [
  [
    baseTestnetContract,
    amoyTestnetContract,
    [DEFAULT_LZ_OPTIONS, DEFAULT_LZ_OPTIONS],
  ],
  [
    amoyTestnetContract,
    citreaTestnetContract,
    [DEFAULT_LZ_OPTIONS, DEFAULT_LZ_OPTIONS],
  ],
  [
    baseTestnetContract,
    citreaTestnetContract,
    [DEFAULT_LZ_OPTIONS, DEFAULT_LZ_OPTIONS],
  ],
];

export default async function (): Promise<LzOmniGraphHardhat> {
  const connections = generateLzConnectionsConfig(pathways);

  return {
    contracts: [
      {
        contract: baseTestnetContract,
      },
      {
        contract: amoyTestnetContract,
      },
      {
        contract: citreaTestnetContract,
      },
    ],
    connections,
  };
}
