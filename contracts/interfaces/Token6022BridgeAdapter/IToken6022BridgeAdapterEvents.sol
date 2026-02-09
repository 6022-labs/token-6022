// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

interface IToken6022BridgeAdapterEvents {
    /// @notice Emitted when the CCIP peer for a chain selector is updated.
    event CcipPeerSet(uint64 indexed chainSelector, address indexed peer);
    /// @notice Emitted when CCIP extraArgs are updated for a chain selector.
    event CcipExtraArgsSet(uint64 indexed chainSelector, bytes extraArgs);
    /// @notice Emitted when a CCIP send operation is initiated.
    event CcipSend(
        uint64 indexed dstChainSelector,
        bytes32 indexed messageId,
        bytes32 indexed transferId,
        address from,
        address to,
        uint256 amount
    );
    /// @notice Emitted when a CCIP message is received and credited.
    event CcipReceive(
        uint64 indexed srcChainSelector,
        bytes32 indexed messageId,
        bytes32 indexed transferId,
        address to,
        uint256 amount
    );
}
