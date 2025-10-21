import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { loadGameFixture } from "./fixtures";

describe("CraftingSearch", function () {
  describe("Search Functionality", function () {
    it("Should mint 3 random resources on search", async function () {
      const { resources, crafting, player1 } = await loadGameFixture();

      await crafting.connect(player1).search();

      // Check that player received exactly 3 resources (could be duplicates)
      let totalBalance = 0n;
      for (let i = 1; i <= 6; i++) {
        totalBalance += await resources.balanceOf(player1.address, i);
      }
      expect(totalBalance).to.equal(3);
    });

    it("Should enforce 60-second cooldown", async function () {
      const { crafting, player1 } = await loadGameFixture();

      // First search should succeed
      await crafting.connect(player1).search();

      // Immediate second search should fail
      await expect(
        crafting.connect(player1).search()
      ).to.be.revertedWithCustomError(crafting, "SearchCooldownActive");

      // Advance time by 60 seconds
      await time.increase(60);

      // Should succeed after cooldown
      await expect(crafting.connect(player1).search()).to.not.be.reverted;
    });
  });

  describe("Crafting Functionality", function () {
    it("Should craft Cossack Saber with correct resources", async function () {
      const { resources, items, crafting, player1 } = await loadGameFixture();

      // Give player exact resources: 3 Iron, 1 Wood, 1 Leather
      await crafting.mintBatch(
        player1.address,
        [2, 1, 4], // IRON, WOOD, LEATHER
        [3, 1, 1]
      );

      // Craft Cossack Saber
      await crafting.connect(player1).craft(1);

      // Check item was minted
      expect(await items.ownerOf(1)).to.equal(player1.address);

      // Check resources were burned
      expect(await resources.balanceOf(player1.address, 2)).to.equal(0); // IRON
      expect(await resources.balanceOf(player1.address, 1)).to.equal(0); // WOOD
      expect(await resources.balanceOf(player1.address, 4)).to.equal(0); // LEATHER
    });

    it("Should craft Elder Staff with correct resources", async function () {
      const { resources, items, crafting, player1 } = await loadGameFixture();

      // Give player exact resources: 2 Wood, 1 Gold, 1 Diamond
      await crafting.mintBatch(
        player1.address,
        [1, 3, 6], // WOOD, GOLD, DIAMOND
        [2, 1, 1]
      );

      // Craft Elder Staff
      await crafting.connect(player1).craft(2);

      // Check item was minted
      expect(await items.ownerOf(1)).to.equal(player1.address);

      // Check resources were burned
      expect(await resources.balanceOf(player1.address, 1)).to.equal(0); // WOOD
      expect(await resources.balanceOf(player1.address, 3)).to.equal(0); // GOLD
      expect(await resources.balanceOf(player1.address, 6)).to.equal(0); // DIAMOND
    });

    it("Should revert when crafting without sufficient resources", async function () {
      const { crafting, player1 } = await loadGameFixture();

      // Give player insufficient resources (only 1 Iron instead of 3)
      await crafting.mintBatch(player1.address, [2], [1]);

      // Try to craft Cossack Saber (needs 3 Iron, 1 Wood, 1 Leather)
      await expect(
        crafting.connect(player1).craft(1)
      ).to.be.revertedWithCustomError(crafting, "InsufficientResources");
    });

    it("Should return correct recipe information", async function () {
      const { crafting, resources } = await loadGameFixture();

      // Get Cossack Saber recipe
      const [saberIds, saberAmounts] = await crafting.getRecipe(1);
      expect(saberIds).to.deep.equal([
        await resources.IRON(),
        await resources.WOOD(),
        await resources.LEATHER(),
      ]);
      expect(saberAmounts).to.deep.equal([3n, 1n, 1n]);

      // Get Elder Staff recipe
      const [staffIds, staffAmounts] = await crafting.getRecipe(2);
      expect(staffIds).to.deep.equal([
        await resources.WOOD(),
        await resources.GOLD(),
        await resources.DIAMOND(),
      ]);
      expect(staffAmounts).to.deep.equal([2n, 1n, 1n]);
    });

    it("Should revert when crafting non-existent item type", async function () {
      const { crafting, player1 } = await loadGameFixture();

      // Try to craft item type 99 (doesn't exist)
      await expect(
        crafting.connect(player1).craft(99)
      ).to.be.revertedWithCustomError(crafting, "RecipeNotFound");
    });

    it("Should revert when getting non-existent recipe", async function () {
      const { crafting } = await loadGameFixture();

      // Try to get recipe for item type 99 (doesn't exist)
      await expect(
        crafting.getRecipe(99)
      ).to.be.revertedWithCustomError(crafting, "RecipeNotFound");
    });

    it("Admin helpers should be restricted (mintBatch)", async function () {
      const { crafting, player1 } = await loadGameFixture();

      await expect(
        crafting.connect(player1).mintBatch(player1.address, [1], [1])
      ).to.be.revertedWithCustomError(crafting, "AccessControlUnauthorizedAccount");
    });

    it("Admin helpers should be restricted (burnBatch)", async function () {
      const { crafting, player1 } = await loadGameFixture();

      await expect(
        crafting.connect(player1).burnBatch(player1.address, [1], [1])
      ).to.be.revertedWithCustomError(crafting, "AccessControlUnauthorizedAccount");
    });
  });
});
