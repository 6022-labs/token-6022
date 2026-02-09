// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

interface IToken6022BridgeCoreErrors {
    /// @notice Thrown when a caller is not an authorized bridge adapter.
    /// @param caller Unauthorized caller address.
    error OnlyAdapter(address caller);

    /// @notice Thrown when attempting to configure a zero adapter address.
    /// @param adapter Invalid adapter address.
    error InvalidAdapter(address adapter);

    /// @notice Thrown when the bridged amount is zero.
    error InvalidAmount();

    /// @notice Thrown when a transfer identifier has already been consumed.
    /// @param transferId Replayed transfer identifier.
    error TransferReplay(bytes32 transferId);

    /// @notice Thrown when a transport identifier has already been consumed.
    /// @param transportId Replayed transport identifier.
    error TransportReplay(bytes32 transportId);
}
