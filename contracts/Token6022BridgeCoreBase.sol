// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { IToken6022BridgeCore } from "./interfaces/IToken6022BridgeCore/IToken6022BridgeCore.sol";

abstract contract Token6022BridgeCoreBase is Ownable, IToken6022BridgeCore {
    mapping(address adapter => bool enabled) public adapters;

    mapping(bytes32 transferId => bool consumed) public outboundTransfers;
    mapping(bytes32 transferId => bool consumed) public inboundTransfers;
    mapping(bytes32 transportId => bool consumed) public inboundTransportIds;

    /// @notice Initializes bridge core ownership.
    /// @param _owner Owner allowed to manage adapters.
    constructor(address _owner) Ownable(_owner) {}

    modifier onlyAdapter() {
        if (!adapters[msg.sender]) {
            revert OnlyAdapter(msg.sender);
        }

        _;
    }

    /// @notice Enables or disables an adapter.
    /// @param _adapter Adapter address to update.
    /// @param _enabled Whether the adapter is authorized.
    function setAdapter(address _adapter, bool _enabled) external onlyOwner {
        if (_adapter == address(0)) {
            revert InvalidAdapter(_adapter);
        }

        adapters[_adapter] = _enabled;

        emit AdapterSet(_adapter, _enabled);
    }

    /// @notice Processes outbound bridge flow and marks transfer id as consumed.
    /// @param _from Address whose tokens are bridged out.
    /// @param _amount Token amount bridged out.
    /// @param _transferId Cross-chain transfer identifier.
    function bridgeOut(address _from, uint256 _amount, bytes32 _transferId) external onlyAdapter {
        if (_amount == 0) {
            revert InvalidAmount();
        }

        if (outboundTransfers[_transferId] || inboundTransfers[_transferId]) {
            revert TransferReplay(_transferId);
        }

        outboundTransfers[_transferId] = true;

        _bridgeOut(_from, _amount);

        emit BridgeOut(_transferId, _from, _amount);
    }

    /// @notice Processes inbound bridge flow and marks transfer and transport ids as consumed.
    /// @param _to Recipient of bridged tokens.
    /// @param _amount Token amount bridged in.
    /// @param _transferId Cross-chain transfer identifier.
    /// @param _transportId Transport-level message identifier.
    function bridgeIn(address _to, uint256 _amount, bytes32 _transferId, bytes32 _transportId) external onlyAdapter {
        if (_amount == 0) {
            revert InvalidAmount();
        }

        if (inboundTransportIds[_transportId]) {
            revert TransportReplay(_transportId);
        }

        if (inboundTransfers[_transferId] || outboundTransfers[_transferId]) {
            revert TransferReplay(_transferId);
        }

        inboundTransportIds[_transportId] = true;
        inboundTransfers[_transferId] = true;

        _bridgeIn(_to, _amount);

        emit BridgeIn(_transferId, _transportId, _to, _amount);
    }

    /// @notice Executes asset handling for outbound bridge flow.
    /// @param _from Address whose tokens are bridged out.
    /// @param _amount Token amount bridged out.
    function _bridgeOut(address _from, uint256 _amount) internal virtual;

    /// @notice Executes asset handling for inbound bridge flow.
    /// @param _to Recipient of bridged tokens.
    /// @param _amount Token amount bridged in.
    function _bridgeIn(address _to, uint256 _amount) internal virtual;
}
