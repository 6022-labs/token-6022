// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { OApp, MessagingFee, Origin } from "@layerzerolabs/oapp-evm/contracts/oapp/OApp.sol";
import { MessagingReceipt } from "@layerzerolabs/lz-evm-protocol-v2/contracts/interfaces/ILayerZeroEndpointV2.sol";

import { IToken6022BridgeCore } from "../interfaces/IToken6022BridgeCore/IToken6022BridgeCore.sol";
import { IToken6022BridgeAdapterLZ } from "../interfaces/adapters/IToken6022BridgeAdapterLZ/IToken6022BridgeAdapterLZ.sol";

contract Token6022BridgeAdapterLZ is OApp, IToken6022BridgeAdapterLZ {
    IToken6022BridgeCore public immutable core;

    mapping(uint32 dstEid => bytes options) public lzSendOptions;

    /// @notice Initializes a LayerZero bridge adapter.
    /// @param _core Bridge core contract.
    /// @param _endpoint LayerZero endpoint address.
    /// @param _owner Owner allowed to configure send options and peers.
    constructor(address _core, address _endpoint, address _owner) OApp(_endpoint, _owner) Ownable(_owner) {
        if (_core == address(0)) {
            revert InvalidCore(_core);
        }

        core = IToken6022BridgeCore(_core);
    }

    /// @notice Sets default LayerZero send options for a destination endpoint id.
    /// @param _dstEid LayerZero destination endpoint id.
    /// @param _options Encoded LayerZero execution options.
    function setLzSendOptions(uint32 _dstEid, bytes calldata _options) external onlyOwner {
        lzSendOptions[_dstEid] = _options;

        emit LzSendOptionsSet(_dstEid, _options);
    }

    /// @notice Quotes LayerZero fee required for a bridge send.
    /// @param _dstEid LayerZero destination endpoint id.
    /// @param _to Recipient on destination chain.
    /// @param _amount Token amount to bridge.
    /// @param _userTransferId User-provided transfer identifier entropy.
    /// @param _options LayerZero execution options; empty uses stored defaults.
    /// @param _payInLzToken True to quote in LZ token, false for native fee.
    /// @return fee LayerZero fee quote.
    function quoteLzSend(
        uint32 _dstEid,
        address _to,
        uint256 _amount,
        bytes32 _userTransferId,
        bytes calldata _options,
        bool _payInLzToken
    ) external view returns (MessagingFee memory fee) {
        bytes32 transferId = _deriveTransferId(msg.sender, _dstEid, _to, _amount, _userTransferId);
        bytes memory payload = abi.encode(transferId, _to, _amount);
        bytes memory options = _resolveOptions(_dstEid, _options);

        fee = _quote(_dstEid, payload, options, _payInLzToken);
    }

    /// @notice Bridges tokens through LayerZero to the configured remote peer.
    /// @param _dstEid LayerZero destination endpoint id.
    /// @param _to Recipient on destination chain.
    /// @param _amount Token amount to bridge.
    /// @param _userTransferId User-provided transfer identifier entropy.
    /// @param _options LayerZero execution options; empty uses stored defaults.
    /// @return receipt LayerZero messaging receipt.
    function sendWithLz(
        uint32 _dstEid,
        address _to,
        uint256 _amount,
        bytes32 _userTransferId,
        bytes calldata _options
    ) external payable returns (MessagingReceipt memory receipt) {
        if (_to == address(0)) {
            revert InvalidRecipient(_to);
        }

        bytes32 transferId = _deriveTransferId(msg.sender, _dstEid, _to, _amount, _userTransferId);

        core.bridgeOut(msg.sender, _amount, transferId);

        bytes memory payload = abi.encode(transferId, _to, _amount);
        bytes memory options = _resolveOptions(_dstEid, _options);

        MessagingFee memory quoted = _quote(_dstEid, payload, options, false);
        if (msg.value < quoted.nativeFee) {
            revert InvalidNativeFee(msg.value, quoted.nativeFee);
        }

        receipt = _lzSend(_dstEid, payload, options, MessagingFee(msg.value, 0), payable(msg.sender));

        emit LzSend(_dstEid, receipt.guid, transferId, msg.sender, _to, _amount);
    }

    /// @notice Handles inbound LayerZero payload and forwards it to core bridge logic.
    /// @param _origin LayerZero origin metadata.
    /// @param _guid LayerZero message guid.
    /// @param _message Encoded bridge payload.
    function _lzReceive(
        Origin calldata _origin,
        bytes32 _guid,
        bytes calldata _message,
        address,
        bytes calldata
    ) internal override {
        (bytes32 transferId, address to, uint256 amount) = abi.decode(_message, (bytes32, address, uint256));

        core.bridgeIn(to, amount, transferId, _guid);

        emit LzReceive(_origin.srcEid, _guid, transferId, to, amount);
    }

    /// @notice Resolves per-send options, falling back to stored defaults.
    /// @param _dstEid LayerZero destination endpoint id.
    /// @param _options Explicit options for this send.
    /// @return options Resolved options used for quote/send.
    function _resolveOptions(uint32 _dstEid, bytes calldata _options) internal view returns (bytes memory options) {
        if (_options.length == 0) {
            options = lzSendOptions[_dstEid];
        } else {
            options = _options;
        }
    }

    /// @notice Derives a collision-resistant transfer identifier from caller and route metadata.
    /// @dev User-provided transfer id is treated as entropy and namespaced by adapter + sender + destination + payload.
    function _deriveTransferId(
        address _sender,
        uint32 _dstEid,
        address _to,
        uint256 _amount,
        bytes32 _userTransferId
    ) internal view returns (bytes32 transferId) {
        transferId = keccak256(abi.encode(address(this), _sender, _dstEid, _to, _amount, _userTransferId));
    }
}
