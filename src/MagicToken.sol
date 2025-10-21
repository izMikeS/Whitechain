// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title MagicToken
 * @notice ERC20 token earned by selling items in the Marketplace
 * @dev Only Marketplace contract can mint tokens through MARKET_ROLE
 */
contract MagicToken is ERC20, AccessControl {
    bytes32 public constant MARKET_ROLE = keccak256("MARKET_ROLE");

    /// @notice Initialize contract with admin address
    /// @param admin Address that will receive DEFAULT_ADMIN_ROLE
    constructor(address admin) ERC20("Magic Token", "MAGIC") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @notice Mint tokens to specified address
    /// @dev Can only be called by addresses with MARKET_ROLE (Marketplace contract)
    /// @param to Address to receive tokens
    /// @param amount Amount of tokens to mint
    function mint(address to, uint256 amount) external onlyRole(MARKET_ROLE) {
        _mint(to, amount);
    }
}
