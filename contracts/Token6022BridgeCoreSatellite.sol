// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.22;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import { Token6022BridgeCoreBase } from "./Token6022BridgeCoreBase.sol";
import { IToken6022BridgeCoreSatellite } from "./interfaces/IToken6022BridgeCoreSatellite/IToken6022BridgeCoreSatellite.sol";

contract Token6022BridgeCoreSatellite is ERC20, Token6022BridgeCoreBase, IToken6022BridgeCoreSatellite {
    /// @notice Initializes a mint/burn satellite token for bridged liquidity.
    /// @param _name ERC20 token name.
    /// @param _symbol ERC20 token symbol.
    /// @param _owner Owner allowed to manage adapters.
    constructor(string memory _name, string memory _symbol, address _owner)
        ERC20(_name, _symbol)
        Token6022BridgeCoreBase(_owner) {}

    /// @notice Burns satellite tokens on outbound bridge flow.
    /// @param _from Address providing satellite tokens.
    /// @param _amount Token amount bridged out.
    function _bridgeOut(address _from, uint256 _amount) internal override {
        _burn(_from, _amount);
    }

    /// @notice Mints satellite tokens on inbound bridge flow.
    /// @param _to Recipient of satellite tokens; zero address is redirected to dead address.
    /// @param _amount Token amount bridged in.
    function _bridgeIn(address _to, uint256 _amount) internal override {
        if (_to == address(0)) {
            _to = address(0xdead);
        }

        _mint(_to, _amount);
    }
}
