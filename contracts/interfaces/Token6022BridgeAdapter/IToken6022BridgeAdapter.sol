// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import {IToken6022BridgeAdapterErrors} from "./IToken6022BridgeAdapterErrors.sol";
import {IToken6022BridgeAdapterEvents} from "./IToken6022BridgeAdapterEvents.sol";
import {IToken6022BridgeAdapterStates} from "./IToken6022BridgeAdapterStates.sol";
import {IToken6022BridgeAdapterOwnerActions} from "./IToken6022BridgeAdapterOwnerActions.sol";
import {IToken6022BridgeAdapterCcipActions} from "./IToken6022BridgeAdapterCcipActions.sol";

interface IToken6022BridgeAdapter is
    IToken6022BridgeAdapterErrors,
    IToken6022BridgeAdapterEvents,
    IToken6022BridgeAdapterStates,
    IToken6022BridgeAdapterOwnerActions,
    IToken6022BridgeAdapterCcipActions
{
    function setCcipPeer(uint64 _chainSelector, address _peer) external;
    function setCcipExtraArgs(uint64 _chainSelector, bytes calldata _extraArgs) external;
}
