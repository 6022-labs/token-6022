// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { IToken6022BridgeAdapterLZErrors } from "./IToken6022BridgeAdapterLZErrors.sol";
import { IToken6022BridgeAdapterLZEvents } from "./IToken6022BridgeAdapterLZEvents.sol";
import { IToken6022BridgeAdapterLZStates } from "./IToken6022BridgeAdapterLZStates.sol";
import { IToken6022BridgeAdapterLZOwnerActions } from "./IToken6022BridgeAdapterLZOwnerActions.sol";
import { IToken6022BridgeAdapterLZActions } from "./IToken6022BridgeAdapterLZActions.sol";

interface IToken6022BridgeAdapterLZ is
    IToken6022BridgeAdapterLZErrors,
    IToken6022BridgeAdapterLZEvents,
    IToken6022BridgeAdapterLZStates,
    IToken6022BridgeAdapterLZOwnerActions,
    IToken6022BridgeAdapterLZActions
{
}
