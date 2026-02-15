// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import {IToken6022BridgeCoreErrors} from "./IToken6022BridgeCoreErrors.sol";
import {IToken6022BridgeCoreEvents} from "./IToken6022BridgeCoreEvents.sol";
import {IToken6022BridgeCoreStates} from "./IToken6022BridgeCoreStates.sol";
import {IToken6022BridgeCoreActions} from "./IToken6022BridgeCoreActions.sol";
import {IToken6022BridgeCoreOwnable} from "./IToken6022BridgeCoreOwnable.sol";

interface IToken6022BridgeCore is
    IToken6022BridgeCoreErrors,
    IToken6022BridgeCoreEvents,
    IToken6022BridgeCoreStates,
    IToken6022BridgeCoreActions,
    IToken6022BridgeCoreOwnable
{
}
