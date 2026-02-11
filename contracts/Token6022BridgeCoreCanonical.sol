// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { Token6022BridgeCoreBase } from "./Token6022BridgeCoreBase.sol";
import { IToken6022BridgeCoreCanonical } from "./interfaces/IToken6022BridgeCoreCanonical/IToken6022BridgeCoreCanonical.sol";
import { IToken6022BridgeCoreOwnable } from "./interfaces/IToken6022BridgeCore/IToken6022BridgeCoreOwnable.sol";

contract Token6022BridgeCoreCanonical is Token6022BridgeCoreBase, IToken6022BridgeCoreCanonical {
    using SafeERC20 for IERC20;

    address public immutable token;

    /// @notice Initializes canonical bridge core for an existing ERC20 token.
    /// @param _token Canonical ERC20 token address.
    /// @param _owner Owner allowed to manage adapters.
    constructor(address _token, address _owner) Token6022BridgeCoreBase(_owner) {
        if (_token == address(0)) {
            revert InvalidToken(_token);
        }

        token = _token;
    }

    function owner() public view override(Token6022BridgeCoreBase, IToken6022BridgeCoreOwnable) returns (address) {
        return Token6022BridgeCoreBase.owner();
    }

    /// @notice Locks canonical tokens on outbound bridge flow.
    /// @param _from Address providing canonical tokens.
    /// @param _amount Token amount bridged out.
    function _bridgeOut(address _from, uint256 _amount) internal override {
        IERC20(token).safeTransferFrom(_from, address(this), _amount);
    }

    /// @notice Releases canonical tokens on inbound bridge flow.
    /// @param _to Recipient of canonical tokens.
    /// @param _amount Token amount bridged in.
    function _bridgeIn(address _to, uint256 _amount) internal override {
        IERC20(token).safeTransfer(_to, _amount);
    }
}
