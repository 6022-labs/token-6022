// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

interface IToken6022BridgeAdapterLZErrors {
    /// @notice Thrown when caller is not the current core owner.
    /// @param caller Unauthorized caller.
    /// @param expectedOwner Current bridge core owner.
    error OnlyCoreOwner(address caller, address expectedOwner);

    /// @notice Thrown when deploying with a zero core address.
    /// @param core Invalid core address.
    error InvalidCore(address core);

    /// @notice Thrown when destination recipient is invalid.
    /// @param recipient Invalid recipient address.
    error InvalidRecipient(address recipient);

    /// @notice Thrown when supplied native fee is below required LayerZero fee.
    /// @param supplied Native value provided by caller.
    /// @param required Required native fee.
    error InvalidNativeFee(uint256 supplied, uint256 required);
}
