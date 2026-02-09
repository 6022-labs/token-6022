// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

interface IToken6022BridgeAdapterCCIPErrors {
    /// @notice Thrown when no trusted remote CCIP peer is configured for destination chain.
    /// @param chainSelector Destination CCIP chain selector.
    error MissingCcipPeer(uint64 chainSelector);

    /// @notice Thrown when an inbound message sender does not match configured peer.
    /// @param chainSelector Source CCIP chain selector.
    /// @param sender Decoded CCIP sender from the message.
    error InvalidCcipPeer(uint64 chainSelector, address sender);

    /// @notice Thrown when deploying with a zero core address.
    /// @param core Invalid core address.
    error InvalidCore(address core);

    /// @notice Thrown when destination recipient is invalid.
    /// @param recipient Invalid recipient address.
    error InvalidRecipient(address recipient);

    /// @notice Thrown when supplied native fee is below required fee.
    /// @param supplied Native value provided by caller.
    /// @param required Required native fee.
    error InvalidNativeFee(uint256 supplied, uint256 required);
}
