// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

interface IToken6022BridgeAdapterLZEvents {
    /// @notice Emitted when default LayerZero send options are updated.
    /// @param dstEid Destination LayerZero endpoint id.
    /// @param options Encoded LayerZero execution options.
    event LzSendOptionsSet(uint32 indexed dstEid, bytes options);

    /// @notice Emitted when an outbound LayerZero bridge payload is sent.
    /// @param dstEid Destination LayerZero endpoint id.
    /// @param guid LayerZero message guid.
    /// @param transferId Cross-chain transfer identifier.
    /// @param from Source address on this chain.
    /// @param to Destination recipient address.
    /// @param amount Bridged token amount.
    event LzSend(
        uint32 indexed dstEid,
        bytes32 indexed guid,
        bytes32 indexed transferId,
        address from,
        address to,
        uint256 amount
    );

    /// @notice Emitted when an inbound LayerZero payload is accepted and bridged in.
    /// @param srcEid Source LayerZero endpoint id.
    /// @param guid LayerZero message guid.
    /// @param transferId Cross-chain transfer identifier.
    /// @param to Destination recipient address on this chain.
    /// @param amount Bridged token amount.
    event LzReceive(
        uint32 indexed srcEid,
        bytes32 indexed guid,
        bytes32 indexed transferId,
        address to,
        uint256 amount
    );
}
