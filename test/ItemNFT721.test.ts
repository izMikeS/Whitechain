import { expect } from "chai";
import { loadGameFixture } from "./fixtures";

describe("ItemNFT721", function () {
  describe("Item Constants", function () {
    it("Should have correct item constants", async function () {
      const { items } = await loadGameFixture();

      expect(await items.COSSACK_SABER()).to.equal(1);
      expect(await items.ELDER_STAFF()).to.equal(2);
    });
  });

  describe("Access Control", function () {
    it("Should only allow MINTER_ROLE to mint", async function () {
      const { items, player1, MINTER_ROLE } = await loadGameFixture();

      await expect(
        items.connect(player1).mintTo(player1.address)
      ).to.be.revertedWithCustomError(items, "AccessControlUnauthorizedAccount");

      // Grant role and try again
      await items.grantRole(MINTER_ROLE, player1.address);
      await items.connect(player1).mintTo(player1.address);
      expect(await items.ownerOf(1)).to.equal(player1.address);
    });

    it("Should only allow BURNER_ROLE to burn", async function () {
      const { items, crafting, marketplace, player1, player2, MINTER_ROLE } = await loadGameFixture();

      // Craft an item
      await crafting.mintBatch(player1.address, [2, 1, 4], [3, 1, 1]);
      await crafting.connect(player1).craft(1);

      // Player without BURNER_ROLE cannot burn
      await expect(
        items.connect(player1).burn(1)
      ).to.be.revertedWithCustomError(items, "AccessControlUnauthorizedAccount");

      // List and purchase (marketplace has BURNER_ROLE and burns on purchase)
      await items.connect(player1).approve(await marketplace.getAddress(), 1);
      await marketplace.connect(player1).list(1, 100n);
      await marketplace.connect(player2).purchase(1);

      // Item should be burned after purchase
      await expect(items.ownerOf(1)).to.be.revertedWithCustomError(items, "ERC721NonexistentToken");
    });
  });

  describe("Interface Support", function () {
    it("Should support ERC721 and AccessControl interfaces", async function () {
      const { items } = await loadGameFixture();

      // ERC721 interface ID: 0x80ac58cd
      expect(await items.supportsInterface("0x80ac58cd")).to.be.true;

      // AccessControl interface ID: 0x7965db0b
      expect(await items.supportsInterface("0x7965db0b")).to.be.true;
    });
  });
});