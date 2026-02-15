// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

interface IToken6022BridgeCoreCanonicalErrors {
    /// @notice Thrown when deploying with a zero canonical token address.
    /// @param token Invalid token address.
    error InvalidToken(address token);
}
