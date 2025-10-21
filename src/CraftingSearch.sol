// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ResourceNFT1155} from "./ResourceNFT1155.sol";
import {ItemNFT721} from "./ItemNFT721.sol";

/**
 * @title CraftingSearch
 * @notice Contract for searching resources and crafting items
 * @dev Implements 60-second cooldown for searches and recipe-based crafting
 */
contract CraftingSearch is AccessControl {
    ResourceNFT1155 public resources;
    ItemNFT721 public items;

    uint256 public constant SEARCH_COOLDOWN = 60;
    uint256 private constant RESOURCE_COUNT = 6;

    /// @notice Mapping of player address to their last search timestamp
    mapping(address => uint256) public lastSearchTime;

    /// @notice Recipe structure defining required resources for crafting
    struct Recipe {
        uint256[] resourceIds;
        uint256[] amounts;
        bool exists;
    }

    /// @notice Mapping of item type to its crafting recipe
    mapping(uint256 => Recipe) public recipes;

    /// @notice Emitted when a player searches for resources
    event ResourcesSearched(address indexed player, uint256[] resourceIds, uint256[] amounts);

    /// @notice Emitted when a player crafts an item
    event ItemCrafted(address indexed player, uint256 itemType, uint256 tokenId);

    error SearchCooldownActive(uint256 remainingTime);
    error RecipeNotFound(uint256 itemType);
    error InsufficientResources(uint256 resourceId, uint256 required, uint256 available);

    /// @notice Initialize contract with admin address and contract references
    /// @param admin Address that will receive DEFAULT_ADMIN_ROLE
    /// @param _resources Address of ResourceNFT1155 contract
    /// @param _items Address of ItemNFT721 contract
    constructor(address admin, ResourceNFT1155 _resources, ItemNFT721 _items) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        resources = _resources;
        items = _items;

        // Initialize recipes
        // Cossack Saber: 3 Iron, 1 Wood, 1 Leather
        uint256[] memory saberIds = new uint256[](3);
        saberIds[0] = resources.IRON();
        saberIds[1] = resources.WOOD();
        saberIds[2] = resources.LEATHER();

        uint256[] memory saberAmounts = new uint256[](3);
        saberAmounts[0] = 3;
        saberAmounts[1] = 1;
        saberAmounts[2] = 1;

        recipes[items.COSSACK_SABER()] = Recipe(saberIds, saberAmounts, true);

        // Elder Staff: 2 Wood, 1 Gold, 1 Diamond
        uint256[] memory staffIds = new uint256[](3);
        staffIds[0] = resources.WOOD();
        staffIds[1] = resources.GOLD();
        staffIds[2] = resources.DIAMOND();

        uint256[] memory staffAmounts = new uint256[](3);
        staffAmounts[0] = 2;
        staffAmounts[1] = 1;
        staffAmounts[2] = 1;

        recipes[items.ELDER_STAFF()] = Recipe(staffIds, staffAmounts, true);
    }

    /// @notice Search for random resources (60-second cooldown)
    /// @dev Generates 3 random resources and mints them to the caller
    function search() external {
        uint256 timeSinceLastSearch = block.timestamp - lastSearchTime[msg.sender];
        if (lastSearchTime[msg.sender] > 0 && timeSinceLastSearch < SEARCH_COOLDOWN) {
            revert SearchCooldownActive(SEARCH_COOLDOWN - timeSinceLastSearch);
        }

        lastSearchTime[msg.sender] = block.timestamp;

        // Generate 3 random resources
        uint256[] memory resourceIds = new uint256[](3);
        uint256[] memory amounts = new uint256[](3);

        for (uint256 i = 0; i < 3; i++) {
            // Pseudorandom for testnet/demo purposes only
            resourceIds[i] = (uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, i))) % RESOURCE_COUNT) + 1;
            amounts[i] = 1;
        }

        resources.mintBatch(msg.sender, resourceIds, amounts);
        emit ResourcesSearched(msg.sender, resourceIds, amounts);
    }

    /// @notice Craft an item using resources
    /// @dev Burns required resources and mints the crafted item
    /// @param itemType Type of item to craft
    function craft(uint256 itemType) external {
        Recipe memory recipe = recipes[itemType];
        if (!recipe.exists) {
            revert RecipeNotFound(itemType);
        }

        // Check if player has enough resources
        for (uint256 i = 0; i < recipe.resourceIds.length; i++) {
            uint256 balance = resources.balanceOf(msg.sender, recipe.resourceIds[i]);
            if (balance < recipe.amounts[i]) {
                revert InsufficientResources(recipe.resourceIds[i], recipe.amounts[i], balance);
            }
        }

        // Burn resources
        resources.burnBatch(msg.sender, recipe.resourceIds, recipe.amounts);

        // Mint item
        uint256 tokenId = items.mintTo(msg.sender);
        emit ItemCrafted(msg.sender, itemType, tokenId);
    }

    /// @notice Get recipe for a specific item type
    /// @param itemType Type of item to query
    /// @return resourceIds Array of resource IDs required
    /// @return amounts Array of amounts required for each resource
    function getRecipe(uint256 itemType) external view returns (uint256[] memory resourceIds, uint256[] memory amounts) {
        Recipe memory recipe = recipes[itemType];
        if (!recipe.exists) {
            revert RecipeNotFound(itemType);
        }
        return (recipe.resourceIds, recipe.amounts);
    }

    /// @notice Helper function to mint resources (for testing)
    /// @dev Only callable by admin
    /// @param to Address to mint resources to
    /// @param ids Array of resource IDs
    /// @param amounts Array of amounts
    function mintBatch(address to, uint256[] calldata ids, uint256[] calldata amounts) external onlyRole(DEFAULT_ADMIN_ROLE) {
        resources.mintBatch(to, ids, amounts);
    }

    /// @notice Helper function to burn resources (for testing)
    /// @dev Only callable by admin
    /// @param from Address to burn resources from
    /// @param ids Array of resource IDs
    /// @param amounts Array of amounts
    function burnBatch(address from, uint256[] calldata ids, uint256[] calldata amounts) external onlyRole(DEFAULT_ADMIN_ROLE) {
        resources.burnBatch(from, ids, amounts);
    }
}
