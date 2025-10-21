import { expect } from "chai";
import { loadGameFixture } from "./fixtures";

describe("ResourceNFT1155", function () {
  describe("Resource Constants", function () {
    it("Should have correct resource constants", async function () {
      const { resources } = await loadGameFixture();

      expect(await resources.WOOD()).to.equal(1);
      expect(await resources.IRON()).to.equal(2);
      expect(await resources.GOLD()).to.equal(3);
      expect(await resources.LEATHER()).to.equal(4);
      expect(await resources.STONE()).to.equal(5);
      expect(await resources.DIAMOND()).to.equal(6);
    });
  });

  describe("Access Control", function () {
    it("Should only allow MINTER_ROLE to mint", async function () {
      const { resources, player1, MINTER_ROLE } = await loadGameFixture();

      await expect(
        resources.connect(player1).mintBatch(player1.address, [1], [10])
      ).to.be.revertedWithCustomError(resources, "AccessControlUnauthorizedAccount");

      // Grant role and try again
      await resources.grantRole(MINTER_ROLE, player1.address);
      await resources.connect(player1).mintBatch(player1.address, [1], [10]);
      expect(await resources.balanceOf(player1.address, 1)).to.equal(10);
    });

    it("Should only allow BURNER_ROLE to burn", async function () {
      const { resources, crafting, player1, MINTER_ROLE, BURNER_ROLE } = await loadGameFixture();

      // Mint some resources first
      await resources.grantRole(MINTER_ROLE, player1.address);
      await resources.connect(player1).mintBatch(player1.address, [1], [10]);

      // Player without role cannot burn
      await expect(
        resources.connect(player1).burnBatch(player1.address, [1], [5])
      ).to.be.revertedWithCustomError(resources, "AccessControlUnauthorizedAccount");

      // Crafting contract has BURNER_ROLE and can burn
      await crafting.burnBatch(player1.address, [1], [5]);
      expect(await resources.balanceOf(player1.address, 1)).to.equal(5);
    });
  });

  describe("Interface Support", function () {
    it("Should support ERC1155 and AccessControl interfaces", async function () {
      const { resources } = await loadGameFixture();

      // ERC1155 interface ID: 0xd9b67a26
      expect(await resources.supportsInterface("0xd9b67a26")).to.be.true;

      // AccessControl interface ID: 0x7965db0b
      expect(await resources.supportsInterface("0x7965db0b")).to.be.true;
    });
  });
});