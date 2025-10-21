import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { loadGameFixture } from "./fixtures";

describe("Full Game Flow Integration", function () {
  it("Should complete search -> craft -> list -> purchase flow", async function () {
    const { resources, items, magic, crafting, marketplace, player1, player2 } = await loadGameFixture();

    // === PLAYER 1 FLOW ===

    // Step 1: Search for resources
    await crafting.connect(player1).search();
    let totalResources = 0n;
    for (let i = 1; i <= 6; i++) {
      totalResources += await resources.balanceOf(player1.address, i);
    }
    expect(totalResources).to.equal(3);

    // Step 2: Give exact resources to craft Cossack Saber
    await crafting.mintBatch(player1.address, [2, 1, 4], [3, 1, 1]);

    // Step 3: Craft item
    await crafting.connect(player1).craft(1);
    expect(await items.ownerOf(1)).to.equal(player1.address);

    // Step 4: List on marketplace
    await items.connect(player1).approve(await marketplace.getAddress(), 1);
    await marketplace.connect(player1).list(1, 100n);

    const listing = await marketplace.getListing(1);
    expect(listing[0]).to.equal(player1.address);
    expect(listing[1]).to.equal(100n);
    expect(listing[2]).to.equal(true);

    // === PLAYER 2 FLOW ===

    // Step 5: Player 2 searches (after cooldown doesn't apply to them)
    await crafting.connect(player2).search();

    // Step 6: Player 2 purchases item
    await marketplace.connect(player2).purchase(1);

    // Verify purchase results
    await expect(items.ownerOf(1)).to.be.revertedWithCustomError(items, "ERC721NonexistentToken");
    expect(await magic.balanceOf(player1.address)).to.equal(100n);

    const finalListing = await marketplace.getListing(1);
    expect(finalListing[2]).to.equal(false);
  });
});