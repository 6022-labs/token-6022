// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

interface IToken6022BridgeAdapterLZOwnerActions {
    /// @notice Sets default LayerZero send options for a destination endpoint id.
    /// @param dstEid LayerZero destination endpoint id.
    /// @param options Encoded LayerZero execution options.
    function setLzSendOptions(uint32 dstEid, bytes calldata options) external;
}
