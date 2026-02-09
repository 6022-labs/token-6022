// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

interface IToken6022BridgeAdapterCCIPActions {
    /// @notice Quotes native fee to send a bridge message through CCIP.
    /// @param dstChainSelector Destination CCIP chain selector.
    /// @param to Recipient on destination chain.
    /// @param amount Token amount to bridge.
    /// @param transferId Cross-chain transfer identifier.
    /// @return fee Required native fee.
    function quoteCcipSend(
        uint64 dstChainSelector,
        address to,
        uint256 amount,
        bytes32 transferId
    ) external view returns (uint256 fee);

    /// @notice Bridges tokens through CCIP to the configured remote peer.
    /// @param dstChainSelector Destination CCIP chain selector.
    /// @param to Recipient on destination chain.
    /// @param amount Token amount to bridge.
    /// @param transferId Cross-chain transfer identifier.
    /// @return messageId CCIP message identifier.
    function sendWithCcip(
        uint64 dstChainSelector,
        address to,
        uint256 amount,
        bytes32 transferId
    ) external payable returns (bytes32 messageId);
}
