// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

interface IToken6022BridgeTokenErrors {
    /// @notice Thrown when a received CCIP message sender does not match the configured peer.
    error InvalidCcipPeer(uint64 sourceChainSelector, address sender);
    /// @notice Thrown when no destination peer is configured for the target chain.
    error MissingCcipPeer(uint64 destinationChainSelector);
    /// @notice Thrown when a CCIP transport message id has already been processed.
    error TransportReplay(bytes32 transportId);
    /// @notice Thrown when a logical bridge transfer id has already been processed.
    error TransferReplay(bytes32 transferId);
    /// @notice Thrown when an amount is zero.
    error InvalidAmount();
    /// @notice Thrown when provided native fee is lower than required router fee.
    error InsufficientNativeFee(uint256 provided, uint256 requiredFee);
}
