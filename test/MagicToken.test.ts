import { expect } from "chai";
import { loadGameFixture } from "./fixtures";

describe("MagicToken", function () {
  describe("Access Control", function () {
    it("Should only allow MARKET_ROLE to mint", async function () {
      const { magic, player1, MARKET_ROLE } = await loadGameFixture();

      await expect(
        magic.connect(player1).mint(player1.address, 100)
      ).to.be.revertedWithCustomError(magic, "AccessControlUnauthorizedAccount");

      // Grant role and try again
      await magic.grantRole(MARKET_ROLE, player1.address);
      await magic.connect(player1).mint(player1.address, 100);
      expect(await magic.balanceOf(player1.address)).to.equal(100);
    });
  });
});