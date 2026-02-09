// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

interface IToken6022BridgeAdapterCCIPEvents {
    /// @notice Emitted when trusted CCIP peer is configured for a chain selector.
    /// @param chainSelector CCIP chain selector.
    /// @param peer Trusted remote adapter address.
    event CcipPeerSet(uint64 indexed chainSelector, address indexed peer);

    /// @notice Emitted when CCIP extra arguments are configured for a chain selector.
    /// @param chainSelector CCIP chain selector.
    /// @param extraArgs Encoded CCIP execution options.
    event CcipExtraArgsSet(uint64 indexed chainSelector, bytes extraArgs);

    /// @notice Emitted when an outbound CCIP bridge message is sent.
    /// @param dstChainSelector Destination CCIP chain selector.
    /// @param messageId CCIP message identifier.
    /// @param transferId Cross-chain transfer identifier.
    /// @param from Source address on this chain.
    /// @param to Destination recipient address.
    /// @param amount Bridged token amount.
    event CcipSend(
        uint64 indexed dstChainSelector,
        bytes32 indexed messageId,
        bytes32 indexed transferId,
        address from,
        address to,
        uint256 amount
    );

    /// @notice Emitted when an inbound CCIP message is accepted and bridged in.
    /// @param srcChainSelector Source CCIP chain selector.
    /// @param messageId CCIP message identifier.
    /// @param transferId Cross-chain transfer identifier.
    /// @param to Destination recipient address on this chain.
    /// @param amount Bridged token amount.
    event CcipReceive(
        uint64 indexed srcChainSelector,
        bytes32 indexed messageId,
        bytes32 indexed transferId,
        address to,
        uint256 amount
    );
}
