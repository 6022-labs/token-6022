// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { IToken6022BridgeCore } from "../IToken6022BridgeCore/IToken6022BridgeCore.sol";
import { IToken6022BridgeCoreSatelliteErrors } from "./IToken6022BridgeCoreSatelliteErrors.sol";
import { IToken6022BridgeCoreSatelliteStates } from "./IToken6022BridgeCoreSatelliteStates.sol";

interface IToken6022BridgeCoreSatellite is
    IToken6022BridgeCoreSatelliteStates,
    IToken6022BridgeCoreSatelliteErrors,
    IToken6022BridgeCore
{
}
