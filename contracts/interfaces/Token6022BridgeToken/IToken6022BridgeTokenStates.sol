// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

interface IToken6022BridgeTokenStates {
    function ccipPeers(uint64 chainSelector) external view returns (address peer);
    function ccipExtraArgs(uint64 chainSelector) external view returns (bytes memory extraArgs);
    function consumedTransportIds(bytes32 transportId) external view returns (bool consumed);
    function consumedTransferIds(bytes32 transferId) external view returns (bool consumed);
}
