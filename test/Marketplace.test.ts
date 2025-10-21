import { expect } from "chai";
import { loadGameFixture } from "./fixtures";

describe("Marketplace", function () {
  describe("Listing Functionality", function () {
    it("Should list item for sale", async function () {
      const { items, crafting, marketplace, player1 } = await loadGameFixture();

      // Craft an item first
      await crafting.mintBatch(player1.address, [2, 1, 4], [3, 1, 1]);
      await crafting.connect(player1).craft(1);

      // Approve and list
      await items.connect(player1).approve(await marketplace.getAddress(), 1);
      await marketplace.connect(player1).list(1, 100n);

      // Check listing
      const listing = await marketplace.getListing(1);
      expect(listing[0]).to.equal(player1.address); // seller
      expect(listing[1]).to.equal(100n); // price
      expect(listing[2]).to.equal(true); // isActive

      // Check item is in escrow
      expect(await items.ownerOf(1)).to.equal(await marketplace.getAddress());
    });

    it("Should delist item", async function () {
      const { items, crafting, marketplace, player1 } = await loadGameFixture();

      // Craft and list
      await crafting.mintBatch(player1.address, [2, 1, 4], [3, 1, 1]);
      await crafting.connect(player1).craft(1);
      await items.connect(player1).approve(await marketplace.getAddress(), 1);
      await marketplace.connect(player1).list(1, 100n);

      // Delist
      await marketplace.connect(player1).delist(1);

      // Check listing is inactive
      const listing = await marketplace.getListing(1);
      expect(listing[2]).to.equal(false); // isActive

      // Check item returned to seller
      expect(await items.ownerOf(1)).to.equal(player1.address);
    });

    it("Should not allow listing same item twice", async function () {
      const { items, crafting, marketplace, player1 } = await loadGameFixture();

      // Craft and list
      await crafting.mintBatch(player1.address, [2, 1, 4], [3, 1, 1]);
      await crafting.connect(player1).craft(1);
      await items.connect(player1).approve(await marketplace.getAddress(), 1);
      await marketplace.connect(player1).list(1, 100n);

      // Try to list again (should fail because item is already listed)
      await expect(
        marketplace.connect(player1).list(1, 200n)
      ).to.be.revertedWithCustomError(marketplace, "ItemAlreadyListed");
    });

    it("Should revert when listing with zero price", async function () {
      const { items, crafting, marketplace, player1 } = await loadGameFixture();

      // Craft an item first
      await crafting.mintBatch(player1.address, [2, 1, 4], [3, 1, 1]);
      await crafting.connect(player1).craft(1);

      await items.connect(player1).approve(await marketplace.getAddress(), 1);

      await expect(
        marketplace.connect(player1).list(1, 0n)
      ).to.be.revertedWithCustomError(marketplace, "InvalidPrice");
    });

    it("Should revert when delisting non-listed item", async function () {
      const { marketplace, player1 } = await loadGameFixture();

      // Try to delist non-existent listing
      await expect(
        marketplace.connect(player1).delist(999)
      ).to.be.revertedWithCustomError(marketplace, "ItemNotListed");
    });

    it("Should revert when non-seller tries to delist", async function () {
      const { items, crafting, marketplace, player1, player2 } = await loadGameFixture();

      // Player 1 crafts and lists
      await crafting.mintBatch(player1.address, [2, 1, 4], [3, 1, 1]);
      await crafting.connect(player1).craft(1);
      await items.connect(player1).approve(await marketplace.getAddress(), 1);
      await marketplace.connect(player1).list(1, 100n);

      // Player 2 tries to delist
      await expect(
        marketplace.connect(player2).delist(1)
      ).to.be.revertedWithCustomError(marketplace, "OnlySellerCanDelist");
    });

    it("Should revert when non-owner tries to list", async function () {
      const { crafting, marketplace, player1, player2 } = await loadGameFixture();

      // Player 1 crafts an item
      await crafting.mintBatch(player1.address, [2, 1, 4], [3, 1, 1]);
      await crafting.connect(player1).craft(1);

      // Player 2 tries to list Player 1's item
      await expect(
        marketplace.connect(player2).list(1, 100n)
      ).to.be.revertedWithCustomError(marketplace, "NotItemOwner");
    });
  });

  describe("Purchase Functionality", function () {
    it("Should purchase item and mint MagicToken", async function () {
      const { items, magic, crafting, marketplace, player1, player2 } = await loadGameFixture();

      // Player 1 crafts and lists
      await crafting.mintBatch(player1.address, [2, 1, 4], [3, 1, 1]);
      await crafting.connect(player1).craft(1);
      await items.connect(player1).approve(await marketplace.getAddress(), 1);
      await marketplace.connect(player1).list(1, 100n);

      // Player 2 purchases
      await marketplace.connect(player2).purchase(1);

      // Check item was burned
      await expect(items.ownerOf(1)).to.be.revertedWithCustomError(items, "ERC721NonexistentToken");

      // Check seller received MagicToken
      expect(await magic.balanceOf(player1.address)).to.equal(100n);

      // Check listing is inactive
      const listing = await marketplace.getListing(1);
      expect(listing[2]).to.equal(false);
    });

    it("Should not allow buying own item", async function () {
      const { items, crafting, marketplace, player1 } = await loadGameFixture();

      // Player 1 crafts and lists
      await crafting.mintBatch(player1.address, [2, 1, 4], [3, 1, 1]);
      await crafting.connect(player1).craft(1);
      await items.connect(player1).approve(await marketplace.getAddress(), 1);
      await marketplace.connect(player1).list(1, 100n);

      // Try to buy own item
      await expect(
        marketplace.connect(player1).purchase(1)
      ).to.be.revertedWithCustomError(marketplace, "CannotBuyOwnItem");
    });

    it("Should revert when purchasing non-listed item", async function () {
      const { marketplace, player1 } = await loadGameFixture();

      // Try to purchase non-existent listing
      await expect(
        marketplace.connect(player1).purchase(999)
      ).to.be.revertedWithCustomError(marketplace, "ItemNotListed");
    });
  });
});
