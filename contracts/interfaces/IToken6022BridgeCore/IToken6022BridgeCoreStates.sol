// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

interface IToken6022BridgeCoreStates {
    /// @notice Returns whether an adapter is authorized to call bridge methods.
    /// @param adapter Adapter address to query.
    /// @return enabled True when adapter is authorized.
    function adapters(address adapter) external view returns (bool enabled);

    /// @notice Returns whether an outbound transfer identifier has been consumed.
    /// @param transferId Cross-chain transfer identifier.
    /// @return consumed True when the transfer has already been used.
    function outboundTransfers(bytes32 transferId) external view returns (bool consumed);

    /// @notice Returns whether an inbound transfer identifier has been consumed.
    /// @param transferId Cross-chain transfer identifier.
    /// @return consumed True when the transfer has already been used.
    function inboundTransfers(bytes32 transferId) external view returns (bool consumed);

    /// @notice Returns whether an inbound transport identifier has been consumed.
    /// @param transportId Transport-level message identifier.
    /// @return consumed True when the transport identifier has already been used.
    function inboundTransportIds(bytes32 transportId) external view returns (bool consumed);
}
