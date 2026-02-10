// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import {
    MessagingFee,
    MessagingReceipt
} from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";

interface IToken6022BridgeAdapterLZActions {
    /// @notice Quotes LayerZero fee for sending a bridge payload.
    /// @param dstEid LayerZero destination endpoint id.
    /// @param to Recipient on destination chain.
    /// @param amount Token amount to bridge.
    /// @param userTransferId User-provided transfer identifier entropy.
    /// @param options LayerZero execution options; empty uses stored defaults.
    /// @param payInLzToken True to quote in LZ token, false for native fee.
    /// @return fee LayerZero fee quote.
    function quoteLzSend(
        uint32 dstEid,
        address to,
        uint256 amount,
        bytes32 userTransferId,
        bytes calldata options,
        bool payInLzToken
    ) external view returns (MessagingFee memory fee);

    /// @notice Bridges tokens through LayerZero to the configured remote peer.
    /// @param dstEid LayerZero destination endpoint id.
    /// @param to Recipient on destination chain.
    /// @param amount Token amount to bridge.
    /// @param userTransferId User-provided transfer identifier entropy.
    /// @param options LayerZero execution options; empty uses stored defaults.
    /// @return receipt LayerZero messaging receipt.
    function sendWithLz(
        uint32 dstEid,
        address to,
        uint256 amount,
        bytes32 userTransferId,
        bytes calldata options
    ) external payable returns (MessagingReceipt memory receipt);
}
