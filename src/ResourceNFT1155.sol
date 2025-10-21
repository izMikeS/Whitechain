// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ResourceNFT1155
 * @notice ERC1155 contract for game resources with role-based access control
 * @dev Only contracts with MINTER_ROLE can mint and only BURNER_ROLE can burn
 */
contract ResourceNFT1155 is ERC1155, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    /// @notice Resource type IDs
    uint256 public constant WOOD = 1;
    uint256 public constant IRON = 2;
    uint256 public constant GOLD = 3;
    uint256 public constant LEATHER = 4;
    uint256 public constant STONE = 5;
    uint256 public constant DIAMOND = 6;

    /// @notice Initialize contract with admin address
    /// @param admin Address that will receive DEFAULT_ADMIN_ROLE
    constructor(address admin) ERC1155("") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @notice Mint batch of resources to specified address
    /// @dev Can only be called by addresses with MINTER_ROLE (CraftingSearch contract)
    /// @param to Address to receive the resources
    /// @param ids Array of resource IDs to mint
    /// @param amounts Array of amounts for each resource
    function mintBatch(
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts
    ) external onlyRole(MINTER_ROLE) {
        _mintBatch(to, ids, amounts, "");
    }

    /// @notice Burn batch of resources from specified address
    /// @dev Can only be called by addresses with BURNER_ROLE (CraftingSearch contract)
    /// @param from Address to burn resources from
    /// @param ids Array of resource IDs to burn
    /// @param amounts Array of amounts for each resource
    function burnBatch(
        address from,
        uint256[] calldata ids,
        uint256[] calldata amounts
    ) external onlyRole(BURNER_ROLE) {
        // Use _update directly to bypass approval check since we verify BURNER_ROLE
        _update(from, address(0), ids, amounts);
    }

    /// @inheritdoc ERC1155
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
