import { ethers } from "hardhat";
import * as fs from "fs";

// Game simulation: minimal logs

interface DeploymentInfo {
  contracts: {
    ResourceNFT1155: string;
    ItemNFT721: string;
    MagicToken: string;
    CraftingSearch: string;
    Marketplace: string;
  };
}

async function main() {
  console.log("Starting simulation...\n");

  // Load deployed contract addresses
  let deploymentInfo: DeploymentInfo;
  try {
    const deploymentData = fs.readFileSync('deployment.json', 'utf-8');
    deploymentInfo = JSON.parse(deploymentData);
    console.log("Loaded deployment.json\n");
  } catch (error) {
    console.error("deployment.json not found. Run: npm run deploy");
    process.exit(1);
  }

  // Get signers (simulated players)
  const [deployer, player1, player2, player3] = await ethers.getSigners();

  // Connect to deployed contracts
  const resources = await ethers.getContractAt("ResourceNFT1155", deploymentInfo.contracts.ResourceNFT1155);
  const items = await ethers.getContractAt("ItemNFT721", deploymentInfo.contracts.ItemNFT721);
  const magic = await ethers.getContractAt("MagicToken", deploymentInfo.contracts.MagicToken);
  const crafting = await ethers.getContractAt("CraftingSearch", deploymentInfo.contracts.CraftingSearch);
  const marketplace = await ethers.getContractAt("Marketplace", deploymentInfo.contracts.Marketplace);

  console.log("Contracts:");
  console.log("  ResourceNFT1155:", deploymentInfo.contracts.ResourceNFT1155);
  console.log("  ItemNFT721:     ", deploymentInfo.contracts.ItemNFT721);
  console.log("  MagicToken:     ", deploymentInfo.contracts.MagicToken);
  console.log("  CraftingSearch: ", deploymentInfo.contracts.CraftingSearch);
  console.log("  Marketplace:    ", deploymentInfo.contracts.Marketplace);
  console.log();

  console.log("Players:");
  console.log("  Player 1:", player1.address);
  console.log("  Player 2:", player2.address);
  console.log("  Player 3:", player3.address);
  console.log();

  // Verify roles before running
  const RES_MINTER = await resources.MINTER_ROLE();
  const RES_BURNER = await resources.BURNER_ROLE();
  const ITEMS_MINTER = await items.MINTER_ROLE();
  const ITEMS_BURNER = await items.BURNER_ROLE();
  const MAGIC_MARKET = await magic.MARKET_ROLE();

  const resMinterOk = await resources.hasRole(RES_MINTER, await crafting.getAddress());
  const resBurnerOk = await resources.hasRole(RES_BURNER, await crafting.getAddress());
  const itemsMinterOk = await items.hasRole(ITEMS_MINTER, await crafting.getAddress());
  const itemsBurnerOk = await items.hasRole(ITEMS_BURNER, await marketplace.getAddress());
  const magicMarketOk = await magic.hasRole(MAGIC_MARKET, await marketplace.getAddress());

  if (!(resMinterOk && resBurnerOk && itemsMinterOk && itemsBurnerOk && magicMarketOk)) {
    console.log("Roles check failed:");
    console.log("  ResourceNFT1155 MINTER→Crafting:", resMinterOk);
    console.log("  ResourceNFT1155 BURNER→Crafting:", resBurnerOk);
    console.log("  ItemNFT721 MINTER→Crafting:", itemsMinterOk);
    console.log("  ItemNFT721 BURNER→Marketplace:", itemsBurnerOk);
    console.log("  MagicToken MARKET→Marketplace:", magicMarketOk);
    console.log("Fix roles (re-deploy or grantRole) and re-run.");
    process.exit(1);
  }

  async function maybeSearch(signer: any, label: string) {
    const addr = await signer.getAddress();
    const last = await crafting.lastSearchTime(addr);
    const blk = await ethers.provider.getBlock("latest");
    const nowTs = BigInt(blk!.timestamp);
    const lastTs = BigInt(last);
    const cooldown = 60n;
    if (lastTs > 0n && nowTs - lastTs < cooldown) {
      const remain = cooldown - (nowTs - lastTs);
      console.log(`Skip ${label} search: cooldown ${remain}s left`);
      return false;
    }
    try {
      const tx = await crafting.connect(signer).search();
      await tx.wait();
      console.log("  done");
      return true;
    } catch {
      console.log(`  ${label} search failed (cooldown or role). Continuing...`);
      return false;
    }
  }

  // Helper function to display resource balances
  async function showResources(address: string, playerName: string) {
    const resources_list = ["WOOD", "IRON", "GOLD", "LEATHER", "STONE", "DIAMOND"];
    const balances = [];
    for (let i = 1; i <= 6; i++) {
      const balance = await resources.balanceOf(address, i);
      if (balance > 0n) {
        balances.push(`${resources_list[i-1]}:${balance}`);
      }
    }
    if (balances.length > 0) {
      console.log(`    ${playerName} resources: ${balances.join(", ")}`);
    }
  }

  // ========== PLAYER 1 ACTIONS ==========
  console.log("PLAYER 1: Search → Craft Saber → List");

  // Player 1 searches for resources
  console.log("Search P1...");
  await maybeSearch(player1, "P1");
  await showResources(player1.address, "Player 1");

  // Give Player 1 exact resources for Cossack Saber (3 Iron, 1 Wood, 1 Leather)
  console.log("Give P1 resources for Saber");
  const txMintP1 = await crafting.connect(deployer).mintBatch(
    player1.address,
    [2, 1, 4], // IRON, WOOD, LEATHER
    [3, 1, 1]
  );
  await txMintP1.wait();
  await showResources(player1.address, "Player 1");

  // Player 1 crafts Cossack Saber
  console.log("Craft Saber (P1)");
  const tx2 = await crafting.connect(player1).craft(1); // COSSACK_SABER = 1
  const rc2 = await tx2.wait();
  // Extract tokenId from ItemCrafted event; fallback to items.nextId()-1
  let saberId: bigint | null = null;
  for (const log of rc2!.logs) {
    try {
      const parsed = crafting.interface.parseLog(log);
      if (parsed && parsed.name === "ItemCrafted") {
        saberId = parsed.args[2] as bigint;
        break;
      }
    } catch {}
  }
  if (saberId === null) {
    const next = await items.nextId();
    saberId = (next as bigint) - 1n;
  }
  const owner1 = await items.ownerOf(saberId);
  console.log(`  tokenId=${saberId} owner:`, owner1);
  await showResources(player1.address, "Player 1");

  // Player 1 lists saber on marketplace
  console.log("List Saber (P1) for 100 MAGIC");
  const txApproveP1 = await items.connect(player1).approve(await marketplace.getAddress(), saberId);
  await txApproveP1.wait();
  const tx3 = await marketplace.connect(player1).list(saberId, 100n);
  await tx3.wait();
  const listing1 = await marketplace.getListing(saberId);
  console.log(`  price: ${listing1[1]} MAGIC`);

  // ========== PLAYER 2 ACTIONS ==========
  console.log("\nPLAYER 2: Search → Craft Staff → Buy Saber");

  // Player 2 searches for resources
  console.log("Search P2...");
  await maybeSearch(player2, "P2");
  await showResources(player2.address, "Player 2");

  // Give Player 2 exact resources for Elder Staff (2 Wood, 1 Gold, 1 Diamond)
  console.log("Give P2 resources for Staff");
  const txMintP2 = await crafting.connect(deployer).mintBatch(
    player2.address,
    [1, 3, 6], // WOOD, GOLD, DIAMOND
    [2, 1, 1]
  );
  await txMintP2.wait();
  await showResources(player2.address, "Player 2");

  // Player 2 crafts Elder Staff
  console.log("Craft Staff (P2)");
  const tx5 = await crafting.connect(player2).craft(2); // ELDER_STAFF = 2
  const rc5 = await tx5.wait();
  let staffId: bigint | null = null;
  for (const log of rc5!.logs) {
    try {
      const parsed = crafting.interface.parseLog(log);
      if (parsed && parsed.name === "ItemCrafted") {
        staffId = parsed.args[2] as bigint;
        break;
      }
    } catch {}
  }
  if (staffId === null) {
    const next = await items.nextId();
    staffId = (next as bigint) - 1n;
  }
  const owner2 = await items.ownerOf(staffId);
  console.log(`  tokenId=${staffId} owner:`, owner2);
  await showResources(player2.address, "Player 2");

  // Player 2 purchases Player 1's saber
  console.log("Buy Saber (P2)");
  const tx6 = await marketplace.connect(player2).purchase(saberId);
  await tx6.wait();
  const magicBalance1 = await magic.balanceOf(player1.address);
  console.log(`  P1 received ${magicBalance1} MAGIC`);

  // Player 2 lists Elder Staff
  console.log("List Staff (P2) for 200 MAGIC");
  const txApproveP2 = await items.connect(player2).approve(await marketplace.getAddress(), staffId);
  await txApproveP2.wait();
  const tx7 = await marketplace.connect(player2).list(staffId, 200n);
  await tx7.wait();
  console.log("  listed");

  // ========== PLAYER 3 ACTIONS ==========
  console.log("\nPLAYER 3: Buy Staff");

  // Player 3 searches (just for demo)
  console.log("Search P3...");
  await maybeSearch(player3, "P3");
  await showResources(player3.address, "Player 3");

  // Player 3 purchases Elder Staff
  console.log("Buy Staff (P3)");
  const tx9 = await marketplace.connect(player3).purchase(staffId);
  await tx9.wait();
  const magicBalance2 = await magic.balanceOf(player2.address);
  console.log(`  P2 received ${magicBalance2} MAGIC`);

  // ========== FINAL SUMMARY ==========
  console.log("\nFINAL STATE");

  console.log("\nMAGIC balances:");
  const p1Magic = await magic.balanceOf(player1.address);
  const p2Magic = await magic.balanceOf(player2.address);
  const p3Magic = await magic.balanceOf(player3.address);
  console.log(`  Player 1: ${p1Magic} MAGIC (sold Cossack Saber)`);
  console.log(`  Player 2: ${p2Magic} MAGIC (sold Elder Staff)`);
  console.log(`  Player 3: ${p3Magic} MAGIC`);

  console.log("\nResources:");
  await showResources(player1.address, "Player 1");
  await showResources(player2.address, "Player 2");
  await showResources(player3.address, "Player 3");

  console.log("\nSimulation complete\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
