// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { IToken6022BridgeCore } from "../../IToken6022BridgeCore/IToken6022BridgeCore.sol";

interface IToken6022BridgeAdapterLZStates {
    /// @notice Returns the bridge core managed by this adapter.
    /// @return Bridge core contract.
    function core() external view returns (IToken6022BridgeCore);

    /// @notice Returns default LayerZero send options for a destination endpoint id.
    /// @param dstEid LayerZero destination endpoint id.
    /// @return options Encoded LayerZero execution options.
    function lzSendOptions(uint32 dstEid) external view returns (bytes memory options);
}
