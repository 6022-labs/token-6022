// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title 6022 Token
 * @author 6022
 * @notice ERC20 token for the 6022 project
 */
contract Token6022 is ERC20 {
    constructor(address to, uint256 initialSupply) ERC20("6022", "6022") {
        _mint(to, initialSupply);
    }
}
