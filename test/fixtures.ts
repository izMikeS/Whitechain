import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

/**
 * Fixture for deploying all game contracts
 * This is reused across all test files to avoid code duplication
 */
export async function deployGameFixture() {
  const [deployer, player1, player2, player3] = await ethers.getSigners();

  // Deploy ResourceNFT1155
  const ResourceNFT1155 = await ethers.getContractFactory("ResourceNFT1155");
  const resources = await ResourceNFT1155.deploy(deployer.address);

  // Deploy ItemNFT721
  const ItemNFT721 = await ethers.getContractFactory("ItemNFT721");
  const items = await ItemNFT721.deploy(deployer.address);

  // Deploy MagicToken
  const MagicToken = await ethers.getContractFactory("MagicToken");
  const magic = await MagicToken.deploy(deployer.address);

  // Deploy CraftingSearch
  const CraftingSearch = await ethers.getContractFactory("CraftingSearch");
  const crafting = await CraftingSearch.deploy(
    deployer.address,
    await resources.getAddress(),
    await items.getAddress()
  );

  // Deploy Marketplace
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(
    deployer.address,
    await items.getAddress(),
    await magic.getAddress()
  );

  // Setup roles
  const MINTER_ROLE = await resources.MINTER_ROLE();
  const BURNER_ROLE = await resources.BURNER_ROLE();
  const MARKET_ROLE = await magic.MARKET_ROLE();

  await resources.grantRole(MINTER_ROLE, await crafting.getAddress());
  await resources.grantRole(BURNER_ROLE, await crafting.getAddress());
  await items.grantRole(MINTER_ROLE, await crafting.getAddress());
  await items.grantRole(BURNER_ROLE, await marketplace.getAddress());
  await magic.grantRole(MARKET_ROLE, await marketplace.getAddress());

  return {
    deployer,
    player1,
    player2,
    player3,
    resources,
    items,
    magic,
    crafting,
    marketplace,
    MINTER_ROLE,
    BURNER_ROLE,
    MARKET_ROLE,
  };
}

/**
 * Helper to load the game fixture
 */
export function loadGameFixture() {
  return loadFixture(deployGameFixture);
}
