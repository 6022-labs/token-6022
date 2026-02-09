// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

interface IToken6022BridgeCoreActions {
    /// @notice Enables or disables a bridge adapter.
    /// @param adapter Adapter address to update.
    /// @param enabled Whether the adapter should be authorized.
    function setAdapter(address adapter, bool enabled) external;

    /// @notice Processes an outbound bridge operation on the current chain.
    /// @param from Address providing tokens on outbound bridge.
    /// @param amount Token amount bridged out.
    /// @param transferId Cross-chain transfer identifier.
    function bridgeOut(address from, uint256 amount, bytes32 transferId) external;

    /// @notice Processes an inbound bridge operation on the current chain.
    /// @param to Recipient of bridged tokens.
    /// @param amount Token amount bridged in.
    /// @param transferId Cross-chain transfer identifier.
    /// @param transportId Transport-level message identifier.
    function bridgeIn(address to, uint256 amount, bytes32 transferId, bytes32 transportId) external;
}
