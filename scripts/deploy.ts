import { ethers } from "hardhat";

async function main() {
  console.log("Deploying to Whitechain Testnet...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // Deploy ResourceNFT1155
  console.log("Deploying ResourceNFT1155...");
  const ResourceNFT1155 = await ethers.getContractFactory("ResourceNFT1155");
  const resources = await ResourceNFT1155.deploy(deployer.address);
  await resources.waitForDeployment();
  const resourcesAddress = await resources.getAddress();
  console.log("ResourceNFT1155:", resourcesAddress);

  // Deploy ItemNFT721
  console.log("\nDeploying ItemNFT721...");
  const ItemNFT721 = await ethers.getContractFactory("ItemNFT721");
  const items = await ItemNFT721.deploy(deployer.address);
  await items.waitForDeployment();
  const itemsAddress = await items.getAddress();
  console.log("ItemNFT721:", itemsAddress);

  // Deploy MagicToken
  console.log("\nDeploying MagicToken...");
  const MagicToken = await ethers.getContractFactory("MagicToken");
  const magic = await MagicToken.deploy(deployer.address);
  await magic.waitForDeployment();
  const magicAddress = await magic.getAddress();
  console.log("MagicToken:", magicAddress);

  // Deploy CraftingSearch
  console.log("\nDeploying CraftingSearch...");
  const CraftingSearch = await ethers.getContractFactory("CraftingSearch");
  const crafting = await CraftingSearch.deploy(
    deployer.address,
    resourcesAddress,
    itemsAddress
  );
  await crafting.waitForDeployment();
  const craftingAddress = await crafting.getAddress();
  console.log("CraftingSearch:", craftingAddress);

  // Deploy Marketplace
  console.log("\nDeploying Marketplace...");
  const Marketplace = await ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(
    deployer.address,
    itemsAddress,
    magicAddress
  );
  await marketplace.waitForDeployment();
  const marketplaceAddress = await marketplace.getAddress();
  console.log("Marketplace:", marketplaceAddress);

  // Configure roles
  console.log("\nConfiguring roles...");

  // ResourceNFT1155 roles
  const MINTER_ROLE = await resources.MINTER_ROLE();
  const BURNER_ROLE = await resources.BURNER_ROLE();

  console.log("  ResourceNFT1155: grant MINTER to CraftingSearch");
  await resources.grantRole(MINTER_ROLE, craftingAddress);

  console.log("  ResourceNFT1155: grant BURNER to CraftingSearch");
  await resources.grantRole(BURNER_ROLE, craftingAddress);

  // ItemNFT721 roles
  const ITEM_MINTER_ROLE = await items.MINTER_ROLE();
  const ITEM_BURNER_ROLE = await items.BURNER_ROLE();

  console.log("  ItemNFT721: grant MINTER to CraftingSearch");
  await items.grantRole(ITEM_MINTER_ROLE, craftingAddress);

  console.log("  ItemNFT721: grant BURNER to Marketplace");
  await items.grantRole(ITEM_BURNER_ROLE, marketplaceAddress);

  // MagicToken roles
  const MARKET_ROLE = await magic.MARKET_ROLE();

  console.log("  MagicToken: grant MARKET to Marketplace");
  await magic.grantRole(MARKET_ROLE, marketplaceAddress);

  console.log("\nRoles configured.\n");

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`ResourceNFT1155: ${resourcesAddress}`);
  console.log(`ItemNFT721:      ${itemsAddress}`);
  console.log(`MagicToken:      ${magicAddress}`);
  console.log(`CraftingSearch:  ${craftingAddress}`);
  console.log(`Marketplace:     ${marketplaceAddress}`);
  console.log(`Deployer:        ${deployer.address}`);
  console.log("=".repeat(60));

  console.log("\nNext steps:");
  console.log("1) Save addresses above");
  console.log("2) Update README.md with addresses");
  console.log("3) Test on testnet\n");

  // Save deployment info to file
  const fs = require('fs');
  const deploymentInfo = {
    network: "whitechain-testnet",
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      ResourceNFT1155: resourcesAddress,
      ItemNFT721: itemsAddress,
      MagicToken: magicAddress,
      CraftingSearch: craftingAddress,
      Marketplace: marketplaceAddress
    }
  };

  fs.writeFileSync(
    'deployment.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("Saved to deployment.json\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
