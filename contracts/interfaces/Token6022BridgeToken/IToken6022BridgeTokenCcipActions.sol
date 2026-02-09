// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

interface IToken6022BridgeTokenCcipActions {
    function quoteCcipSend(
        uint64 _dstChainSelector,
        address _to,
        uint256 _amount,
        bytes32 _transferId
    ) external view returns (uint256 fee);

    function sendWithCcip(
        uint64 _dstChainSelector,
        address _to,
        uint256 _amount,
        bytes32 _transferId
    ) external payable returns (bytes32 messageId);
}
