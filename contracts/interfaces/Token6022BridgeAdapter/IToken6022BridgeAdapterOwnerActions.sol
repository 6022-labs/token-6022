// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import {IToken6022BridgeAdapterErrors} from "./IToken6022BridgeAdapterErrors.sol";
import {IToken6022BridgeAdapterEvents} from "./IToken6022BridgeAdapterEvents.sol";
import {IToken6022BridgeAdapterStates} from "./IToken6022BridgeAdapterStates.sol";

interface IToken6022BridgeAdapterOwnerActions {
    function setCcipPeer(uint64 _chainSelector, address _peer) external;
    function setCcipExtraArgs(uint64 _chainSelector, bytes calldata _extraArgs) external;
}
