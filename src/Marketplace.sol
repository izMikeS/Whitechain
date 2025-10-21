// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {ItemNFT721} from "./ItemNFT721.sol";
import {MagicToken} from "./MagicToken.sol";

/**
 * @title Marketplace
 * @notice Marketplace for trading crafted items for MagicToken
 * @dev Items are burned upon purchase and seller receives MagicToken
 */
contract Marketplace is AccessControl, ReentrancyGuard {
    ItemNFT721 public items;
    MagicToken public magic;

    /// @notice Listing structure
    struct Listing {
        address seller;
        uint256 price;
        bool active;
    }

    /// @notice Mapping of token ID to its listing
    mapping(uint256 => Listing) public listings;

    /// @notice Emitted when an item is listed
    event ItemListed(uint256 indexed tokenId, address indexed seller, uint256 price);

    /// @notice Emitted when an item is delisted
    event ItemDelisted(uint256 indexed tokenId);

    /// @notice Emitted when an item is purchased
    event ItemPurchased(uint256 indexed tokenId, address indexed buyer, address indexed seller, uint256 price);

    error NotItemOwner();
    error ItemNotListed();
    error ItemAlreadyListed();
    error OnlySellerCanDelist();
    error CannotBuyOwnItem();
    error InvalidPrice();

    /// @notice Initialize contract with admin address and contract references
    /// @param admin Address that will receive DEFAULT_ADMIN_ROLE
    /// @param _items Address of ItemNFT721 contract
    /// @param _magic Address of MagicToken contract
    constructor(address admin, ItemNFT721 _items, MagicToken _magic) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        items = _items;
        magic = _magic;
    }

    /// @notice List an item for sale
    /// @dev Caller must be the owner of the token and approve this contract
    /// @param tokenId ID of the item to list
    /// @param price Price in MagicToken
    function list(uint256 tokenId, uint256 price) external nonReentrant {
        if (price == 0) {
            revert InvalidPrice();
        }
        if (listings[tokenId].active) {
            revert ItemAlreadyListed();
        }
        if (items.ownerOf(tokenId) != msg.sender) {
            revert NotItemOwner();
        }

        // Transfer item to marketplace for escrow
        items.transferFrom(msg.sender, address(this), tokenId);

        listings[tokenId] = Listing({
            seller: msg.sender,
            price: price,
            active: true
        });

        emit ItemListed(tokenId, msg.sender, price);
    }

    /// @notice Remove an item from listing
    /// @dev Only the seller can delist their item
    /// @param tokenId ID of the item to delist
    function delist(uint256 tokenId) external nonReentrant {
        Listing memory listing = listings[tokenId];
        if (!listing.active) {
            revert ItemNotListed();
        }
        if (listing.seller != msg.sender) {
            revert OnlySellerCanDelist();
        }

        // Return item to seller
        items.transferFrom(address(this), msg.sender, tokenId);

        delete listings[tokenId];
        emit ItemDelisted(tokenId);
    }

    /// @notice Purchase a listed item
    /// @dev Burns the item and mints MagicToken to the seller
    /// @param tokenId ID of the item to purchase
    function purchase(uint256 tokenId) external nonReentrant {
        Listing memory listing = listings[tokenId];
        if (!listing.active) {
            revert ItemNotListed();
        }
        if (listing.seller == msg.sender) {
            revert CannotBuyOwnItem();
        }

        // Mark as inactive before state changes
        delete listings[tokenId];

        // Burn the item (marketplace owns it)
        items.burn(tokenId);

        // Mint MagicToken to seller
        magic.mint(listing.seller, listing.price);

        emit ItemPurchased(tokenId, msg.sender, listing.seller, listing.price);
    }

    /// @notice Get listing details
    /// @param tokenId ID of the item
    /// @return seller Address of the seller
    /// @return price Price in MagicToken
    /// @return active Whether the listing is active
    function getListing(uint256 tokenId) external view returns (address seller, uint256 price, bool active) {
        Listing memory listing = listings[tokenId];
        return (listing.seller, listing.price, listing.active);
    }
}
