// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import {IToken6022BridgeTokenErrors} from "./IToken6022BridgeTokenErrors.sol";
import {IToken6022BridgeTokenEvents} from "./IToken6022BridgeTokenEvents.sol";
import {IToken6022BridgeTokenStates} from "./IToken6022BridgeTokenStates.sol";
import {IToken6022BridgeTokenOwnerActions} from "./IToken6022BridgeTokenOwnerActions.sol";
import {IToken6022BridgeTokenCcipActions} from "./IToken6022BridgeTokenCcipActions.sol";

interface IToken6022BridgeToken is
    IToken6022BridgeTokenErrors,
    IToken6022BridgeTokenEvents,
    IToken6022BridgeTokenStates,
    IToken6022BridgeTokenOwnerActions,
    IToken6022BridgeTokenCcipActions
{
}
