// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

interface IToken6022BridgeCoreEvents {
    /// @notice Emitted when an adapter authorization is updated.
    /// @param adapter Adapter address.
    /// @param enabled Whether the adapter is enabled.
    event AdapterSet(address indexed adapter, bool enabled);

    /// @notice Emitted when an outbound bridge operation is processed.
    /// @param transferId Cross-chain transfer identifier.
    /// @param from Source address on this chain.
    /// @param amount Bridged token amount.
    event BridgeOut(bytes32 indexed transferId, address indexed from, uint256 amount);

    /// @notice Emitted when an inbound bridge operation is processed.
    /// @param transferId Cross-chain transfer identifier.
    /// @param transportId Transport-level message identifier.
    /// @param to Recipient address on this chain.
    /// @param amount Bridged token amount.
    event BridgeIn(bytes32 indexed transferId, bytes32 indexed transportId, address indexed to, uint256 amount);
}
