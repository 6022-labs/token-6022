// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

interface IToken6022BridgeCoreCanonicalStates {
    /// @notice Returns the canonical ERC20 token locked by this core.
    /// @return Canonical token address.
    function token() external view returns (address);
}
