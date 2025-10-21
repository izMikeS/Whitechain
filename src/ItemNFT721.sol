// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ItemNFT721
 * @notice ERC721 contract for crafted game items with role-based access control
 * @dev Only MINTER_ROLE can mint and only BURNER_ROLE can burn items
 */
contract ItemNFT721 is ERC721, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    uint256 public nextId = 1;

    /// @notice Item types
    uint256 public constant COSSACK_SABER = 1;
    uint256 public constant ELDER_STAFF = 2;

    /// @notice Initialize contract with admin address
    /// @param admin Address that will receive DEFAULT_ADMIN_ROLE
    constructor(address admin) ERC721("Cossack Items", "CITEM") {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    /// @notice Mint a new item to specified address
    /// @dev Can only be called by addresses with MINTER_ROLE (CraftingSearch contract)
    /// @param to Address to receive the item
    /// @return tokenId The ID of the newly minted item
    function mintTo(
        address to
    ) external onlyRole(MINTER_ROLE) returns (uint256) {
        uint256 id = nextId++;
        _safeMint(to, id);
        return id;
    }

    /// @notice Burn an item
    /// @dev Can only be called by addresses with BURNER_ROLE (Marketplace contract)
    /// @param tokenId The ID of the item to burn
    function burn(uint256 tokenId) external onlyRole(BURNER_ROLE) {
        _burn(tokenId);
    }

    /// @inheritdoc ERC721
    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
