// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { IToken6022BridgeCore } from "../IToken6022BridgeCore/IToken6022BridgeCore.sol";
import { IToken6022BridgeCoreCanonicalErrors } from "./IToken6022BridgeCoreCanonicalErrors.sol";
import { IToken6022BridgeCoreCanonicalStates } from "./IToken6022BridgeCoreCanonicalStates.sol";

interface IToken6022BridgeCoreCanonical is
    IToken6022BridgeCore,
    IToken6022BridgeCoreCanonicalErrors,
    IToken6022BridgeCoreCanonicalStates
{
}
