// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { IToken6022BridgeCore } from "../../IToken6022BridgeCore/IToken6022BridgeCore.sol";

interface IToken6022BridgeAdapterCCIPStates {
    /// @notice Returns the bridge core managed by this adapter.
    /// @return Bridge core contract.
    function core() external view returns (IToken6022BridgeCore);

    /// @notice Returns the trusted remote adapter for a CCIP chain selector.
    /// @param chainSelector CCIP chain selector.
    /// @return peer Trusted remote adapter identifier bytes.
    function ccipPeers(uint64 chainSelector) external view returns (bytes memory peer);

    /// @notice Returns CCIP extra arguments configured for destination chain selector.
    /// @param chainSelector CCIP chain selector.
    /// @return extraArgs Encoded CCIP execution options.
    function ccipExtraArgs(uint64 chainSelector) external view returns (bytes memory extraArgs);
}
