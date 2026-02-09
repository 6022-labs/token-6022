// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

interface IToken6022BridgeAdapterCCIPOwnerActions {
    /// @notice Sets the trusted CCIP peer for a source or destination chain.
    /// @param chainSelector CCIP chain selector.
    /// @param peer Trusted remote adapter address.
    function setCcipPeer(uint64 chainSelector, address peer) external;

    /// @notice Sets CCIP extra arguments used when sending to a destination chain.
    /// @param chainSelector CCIP destination chain selector.
    /// @param extraArgs Encoded CCIP execution options.
    function setCcipExtraArgs(uint64 chainSelector, bytes calldata extraArgs) external;
}
