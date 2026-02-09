// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import {IToken6022BridgeTokenErrors} from "./IToken6022BridgeTokenErrors.sol";
import {IToken6022BridgeTokenEvents} from "./IToken6022BridgeTokenEvents.sol";
import {IToken6022BridgeTokenStates} from "./IToken6022BridgeTokenStates.sol";

interface IToken6022BridgeTokenOwnerActions {
    function setCcipPeer(uint64 _chainSelector, address _peer) external;
    function setCcipExtraArgs(uint64 _chainSelector, bytes calldata _extraArgs) external;
}
