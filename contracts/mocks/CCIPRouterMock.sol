// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import { IAny2EVMMessageReceiver } from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IAny2EVMMessageReceiver.sol";
import { IRouterClient } from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import { Client } from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";

contract CCIPRouterMock is IRouterClient {
    uint64 public immutable chainSelector;

    uint256 public flatFee = 1;
    uint256 private nonce;

    mapping(uint64 destinationChainSelector => bool supported) public supportedChains;

    constructor(uint64 _chainSelector) {
        chainSelector = _chainSelector;
    }

    function setChainSupported(uint64 _chainSelector, bool _supported) external {
        supportedChains[_chainSelector] = _supported;
    }

    function setFlatFee(uint256 _flatFee) external {
        flatFee = _flatFee;
    }

    function isChainSupported(uint64 _chainSelector) external view override returns (bool supported) {
        return supportedChains[_chainSelector];
    }

    function getSupportedTokens(uint64) external pure override returns (address[] memory tokens) {
        return new address[](0);
    }

    function getFee(
        uint64 destinationChainSelector,
        Client.EVM2AnyMessage memory
    ) public view override returns (uint256 fee) {
        if (!supportedChains[destinationChainSelector]) {
            return 0;
        }

        return flatFee;
    }

    function ccipSend(
        uint64 destinationChainSelector,
        Client.EVM2AnyMessage calldata message
    ) external payable override returns (bytes32 messageId) {
        if (!supportedChains[destinationChainSelector]) {
            revert UnsupportedDestinationChain(destinationChainSelector);
        }

        if (message.feeToken != address(0)) {
            revert InsufficientFeeTokenAmount();
        }

        uint256 fee = getFee(destinationChainSelector, message);
        if (msg.value < fee) {
            revert InvalidMsgValue();
        }

        messageId = keccak256(
            abi.encode(
                chainSelector,
                destinationChainSelector,
                msg.sender,
                nonce,
                message.receiver,
                message.data
            )
        );

        nonce += 1;

        Client.EVMTokenAmount[] memory tokenAmounts = new Client.EVMTokenAmount[](0);
        Client.Any2EVMMessage memory any2EvmMessage = Client.Any2EVMMessage({
            messageId: messageId,
            sourceChainSelector: chainSelector,
            sender: abi.encode(msg.sender),
            data: message.data,
            destTokenAmounts: tokenAmounts
        });

        address receiver = abi.decode(message.receiver, (address));
        IAny2EVMMessageReceiver(receiver).ccipReceive(any2EvmMessage);
    }

    function route(
        address _receiver,
        Client.Any2EVMMessage calldata _message
    ) external {
        IAny2EVMMessageReceiver(_receiver).ccipReceive(_message);
    }
}
