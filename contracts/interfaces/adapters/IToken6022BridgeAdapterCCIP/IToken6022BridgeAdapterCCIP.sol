// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { IToken6022BridgeAdapterCCIPErrors } from "./IToken6022BridgeAdapterCCIPErrors.sol";
import { IToken6022BridgeAdapterCCIPEvents } from "./IToken6022BridgeAdapterCCIPEvents.sol";
import { IToken6022BridgeAdapterCCIPStates } from "./IToken6022BridgeAdapterCCIPStates.sol";
import { IToken6022BridgeAdapterCCIPOwnerActions } from "./IToken6022BridgeAdapterCCIPOwnerActions.sol";
import { IToken6022BridgeAdapterCCIPActions } from "./IToken6022BridgeAdapterCCIPActions.sol";

interface IToken6022BridgeAdapterCCIP is
    IToken6022BridgeAdapterCCIPErrors,
    IToken6022BridgeAdapterCCIPEvents,
    IToken6022BridgeAdapterCCIPStates,
    IToken6022BridgeAdapterCCIPOwnerActions,
    IToken6022BridgeAdapterCCIPActions
{
}
