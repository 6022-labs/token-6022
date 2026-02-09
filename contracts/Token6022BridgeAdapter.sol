// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { OFTAdapter } from "@layerzerolabs/oft-evm/contracts/OFTAdapter.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { CCIPReceiver } from "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";
import { IRouterClient } from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import { Client } from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";
import { IToken6022BridgeAdapter } from "./interfaces/Token6022BridgeAdapter/IToken6022BridgeAdapter.sol";

/// @notice Canonical-chain adapter using lock/release for both LayerZero and CCIP.
contract Token6022BridgeAdapter is OFTAdapter, CCIPReceiver, IToken6022BridgeAdapter {
    using SafeERC20 for IERC20;

    mapping(uint64 chainSelector => address peer) public ccipPeers;
    mapping(uint64 chainSelector => bytes extraArgs) public ccipExtraArgs;

    mapping(bytes32 transportId => bool consumed) public consumedTransportIds;
    mapping(bytes32 transferId => bool consumed) public consumedTransferIds;

    constructor(
        address _token,
        address _lzEndpoint,
        address _ccipRouter,
        address _delegate
    ) OFTAdapter(_token, _lzEndpoint, _delegate) CCIPReceiver(_ccipRouter) Ownable(_delegate) {}

    function setCcipPeer(uint64 _chainSelector, address _peer) external onlyOwner {
        ccipPeers[_chainSelector] = _peer;
        emit CcipPeerSet(_chainSelector, _peer);
    }

    function setCcipExtraArgs(uint64 _chainSelector, bytes calldata _extraArgs) external onlyOwner {
        ccipExtraArgs[_chainSelector] = _extraArgs;
        emit CcipExtraArgsSet(_chainSelector, _extraArgs);
    }

    function quoteCcipSend(
        uint64 _dstChainSelector,
        address _to,
        uint256 _amount,
        bytes32 _transferId
    ) external view returns (uint256 fee) {
        return IRouterClient(getRouter()).getFee(_dstChainSelector, _buildCcipMessage(_dstChainSelector, _to, _amount, _transferId));
    }

    function sendWithCcip(
        uint64 _dstChainSelector,
        address _to,
        uint256 _amount,
        bytes32 _transferId
    ) external payable returns (bytes32 messageId) {
        if (_amount == 0) {
            revert InvalidAmount();
        }

        if (ccipPeers[_dstChainSelector] == address(0)) {
            revert MissingCcipPeer(_dstChainSelector);
        }

        innerToken.safeTransferFrom(msg.sender, address(this), _amount);

        Client.EVM2AnyMessage memory message = _buildCcipMessage(
            _dstChainSelector,
            _to,
            _amount,
            _transferId
        );

        uint256 fee = IRouterClient(getRouter()).getFee(_dstChainSelector, message);
        if (msg.value < fee) {
            revert InsufficientNativeFee(msg.value, fee);
        }

        messageId = IRouterClient(getRouter()).ccipSend{ value: msg.value }(_dstChainSelector, message);

        emit CcipSend(_dstChainSelector, messageId, _transferId, msg.sender, _to, _amount);
    }

    function _ccipReceive(Client.Any2EVMMessage memory _message) internal override {
        address sourceSender = abi.decode(_message.sender, (address));
        address expectedPeer = ccipPeers[_message.sourceChainSelector];

        if (sourceSender != expectedPeer) {
            revert InvalidCcipPeer(_message.sourceChainSelector, sourceSender);
        }

        if (consumedTransportIds[_message.messageId]) {
            revert TransportReplay(_message.messageId);
        }
        consumedTransportIds[_message.messageId] = true;

        (bytes32 transferId, address to, uint256 amount) = abi.decode(
            _message.data,
            (bytes32, address, uint256)
        );

        if (consumedTransferIds[transferId]) {
            revert TransferReplay(transferId);
        }
        consumedTransferIds[transferId] = true;

        if (amount == 0) {
            revert InvalidAmount();
        }

        innerToken.safeTransfer(to, amount);

        emit CcipReceive(
            _message.sourceChainSelector,
            _message.messageId,
            transferId,
            to,
            amount
        );
    }

    function _buildCcipMessage(
        uint64 _dstChainSelector,
        address _to,
        uint256 _amount,
        bytes32 _transferId
    ) internal view returns (Client.EVM2AnyMessage memory message) {
        Client.EVMTokenAmount[] memory tokenAmounts = new Client.EVMTokenAmount[](0);

        message = Client.EVM2AnyMessage({
            receiver: abi.encode(ccipPeers[_dstChainSelector]),
            data: abi.encode(_transferId, _to, _amount),
            tokenAmounts: tokenAmounts,
            feeToken: address(0),
            extraArgs: ccipExtraArgs[_dstChainSelector]
        });
    }
}
