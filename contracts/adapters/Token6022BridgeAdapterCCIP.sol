// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { CCIPReceiver } from "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";
import { IRouterClient } from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import { Client } from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";

import { IToken6022BridgeCore } from "../interfaces/IToken6022BridgeCore/IToken6022BridgeCore.sol";
import { IToken6022BridgeAdapterCCIP } from "../interfaces/adapters/IToken6022BridgeAdapterCCIP/IToken6022BridgeAdapterCCIP.sol";

contract Token6022BridgeAdapterCCIP is CCIPReceiver, Ownable, IToken6022BridgeAdapterCCIP {
    IToken6022BridgeCore public immutable core;

    mapping(uint64 chainSelector => address peer) public ccipPeers;
    mapping(uint64 chainSelector => bytes extraArgs) public ccipExtraArgs;

    /// @notice Initializes a CCIP bridge adapter.
    /// @param _core Bridge core contract.
    /// @param _ccipRouter Chainlink CCIP router address.
    /// @param _owner Owner allowed to configure peers and options.
    constructor(address _core, address _ccipRouter, address _owner) CCIPReceiver(_ccipRouter) Ownable(_owner) {
        if (_core == address(0)) {
            revert InvalidCore(_core);
        }

        core = IToken6022BridgeCore(_core);
    }

    /// @notice Sets the trusted remote CCIP adapter for a chain selector.
    /// @param _chainSelector CCIP chain selector.
    /// @param _peer Trusted remote adapter.
    function setCcipPeer(uint64 _chainSelector, address _peer) external onlyOwner {
        ccipPeers[_chainSelector] = _peer;
        emit CcipPeerSet(_chainSelector, _peer);
    }

    /// @notice Sets CCIP extra arguments for a destination chain selector.
    /// @param _chainSelector CCIP destination chain selector.
    /// @param _extraArgs Encoded CCIP execution options.
    function setCcipExtraArgs(uint64 _chainSelector, bytes calldata _extraArgs) external onlyOwner {
        ccipExtraArgs[_chainSelector] = _extraArgs;
        emit CcipExtraArgsSet(_chainSelector, _extraArgs);
    }

    /// @notice Quotes native fee required to send a bridge message through CCIP.
    /// @param _dstChainSelector Destination CCIP chain selector.
    /// @param _to Recipient on destination chain.
    /// @param _amount Token amount to bridge.
    /// @param _userTransferId User-provided transfer identifier entropy.
    /// @return fee Required native fee.
    function quoteCcipSend(
        uint64 _dstChainSelector,
        address _to,
        uint256 _amount,
        bytes32 _userTransferId
    ) external view returns (uint256 fee) {
        bytes32 transferId = _deriveTransferId(msg.sender, _dstChainSelector, _to, _amount, _userTransferId);

        return IRouterClient(getRouter()).getFee(
            _dstChainSelector, _buildCcipMessage(_dstChainSelector, _to, _amount, transferId)
        );
    }

    /// @notice Bridges tokens through CCIP to the configured remote peer.
    /// @param _dstChainSelector Destination CCIP chain selector.
    /// @param _to Recipient on destination chain.
    /// @param _amount Token amount to bridge.
    /// @param _userTransferId User-provided transfer identifier entropy.
    /// @return messageId CCIP message identifier.
    function sendWithCcip(
        uint64 _dstChainSelector,
        address _to,
        uint256 _amount,
        bytes32 _userTransferId
    ) external payable returns (bytes32 messageId) {
        if (_to == address(0)) {
            revert InvalidRecipient(_to);
        }

        if (ccipPeers[_dstChainSelector] == address(0)) {
            revert MissingCcipPeer(_dstChainSelector);
        }

        bytes32 transferId = _deriveTransferId(msg.sender, _dstChainSelector, _to, _amount, _userTransferId);

        core.bridgeOut(msg.sender, _amount, transferId);

        Client.EVM2AnyMessage memory message = _buildCcipMessage(_dstChainSelector, _to, _amount, transferId);

        uint256 fee = IRouterClient(getRouter()).getFee(_dstChainSelector, message);
        if (msg.value < fee) {
            revert InvalidNativeFee(msg.value, fee);
        }

        messageId = IRouterClient(getRouter()).ccipSend{ value: fee }(_dstChainSelector, message);

        uint256 refund = msg.value - fee;
        if (refund != 0) {
            (bool success,) = payable(msg.sender).call{ value: refund }("");
            if (!success) {
                revert NativeRefundFailed(msg.sender, refund);
            }
        }

        emit CcipSend(_dstChainSelector, messageId, transferId, msg.sender, _to, _amount);
    }

    /// @notice Handles inbound CCIP messages and forwards payload to core bridge logic.
    /// @param _message Incoming CCIP message.
    function _ccipReceive(Client.Any2EVMMessage memory _message) internal override {
        address sourceSender = abi.decode(_message.sender, (address));
        address expectedPeer = ccipPeers[_message.sourceChainSelector];

        if (sourceSender != expectedPeer) {
            revert InvalidCcipPeer(_message.sourceChainSelector, sourceSender);
        }

        (bytes32 transferId, address to, uint256 amount) = abi.decode(_message.data, (bytes32, address, uint256));

        core.bridgeIn(to, amount, transferId, _message.messageId);

        emit CcipReceive(_message.sourceChainSelector, _message.messageId, transferId, to, amount);
    }

    /// @notice Builds a CCIP message for bridge transfer payload.
    /// @param _dstChainSelector Destination CCIP chain selector.
    /// @param _to Recipient on destination chain.
    /// @param _amount Token amount to bridge.
    /// @param _transferId Cross-chain transfer identifier.
    /// @return message Encoded CCIP message.
    function _buildCcipMessage(
        uint64 _dstChainSelector,
        address _to,
        uint256 _amount,
        bytes32 _transferId
    ) internal view returns (Client.EVM2AnyMessage memory message) {
        message = Client.EVM2AnyMessage({
            receiver: abi.encode(ccipPeers[_dstChainSelector]),
            data: abi.encode(_transferId, _to, _amount),
            tokenAmounts: new Client.EVMTokenAmount[](0),
            feeToken: address(0),
            extraArgs: ccipExtraArgs[_dstChainSelector]
        });
    }

    /// @notice Derives a collision-resistant transfer identifier from caller and route metadata.
    /// @dev User-provided transfer id is treated as entropy and namespaced by sender + destination + payload.
    function _deriveTransferId(
        address _sender,
        uint64 _dstChainSelector,
        address _to,
        uint256 _amount,
        bytes32 _userTransferId
    ) internal pure returns (bytes32 transferId) {
        transferId = keccak256(abi.encode(_sender, _dstChainSelector, _to, _amount, _userTransferId));
    }
}
