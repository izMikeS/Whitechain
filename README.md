# Cossack Business — Whitechain Testnet

Solidity 0.8.24. Hardhat + TypeScript. Role‑gated ERC1155/721/20 game with a search, craft, sell loop.

## 1. Overview
- ERC1155 resources: `WOOD=1, IRON=2, GOLD=3, LEATHER=4, STONE=5, DIAMOND=6`.
- ERC721 items: mint via crafting only; burn on sale.
- `MagicToken` (ERC20): minted only by `Marketplace` on purchase.
- Access control: OpenZeppelin `AccessControl`; no direct EOA mint/burn for base NFTs or ERC20.
- RNG in `search()` is pseudorandom (OK for testnet/demo).

## 2. Contracts
- `ResourceNFT1155.sol`
  - Roles: `MINTER_ROLE`, `BURNER_ROLE` → `CraftingSearch`.
- `ItemNFT721.sol`
  - Roles: `MINTER_ROLE` → `CraftingSearch`; `BURNER_ROLE` → `Marketplace`.
- `CraftingSearch.sol`
  - `search()` — once per 60s, mints 3 random resources.
  - `craft(itemType)` — checks balances, burns resources, mints item; emits `ItemCrafted`.
- `Marketplace.sol`
  - `list(tokenId, price)` — escrow; price > 0; `nonReentrant`.
  - `purchase(tokenId)` — burns item, mints MAGIC to seller.
- `MagicToken.sol`
  - `MARKET_ROLE` → `Marketplace`.

Recipes
- Cossack Saber: `3×IRON, 1×WOOD, 1×LEATHER`.
- Elder Staff: `2×WOOD, 1×GOLD, 1×DIAMOND`.

## 3. Deployed (Whitechain Testnet)
- ResourceNFT1155: `0x0f8b53Cd0e519d5ECd796d139B5c2472E0e1a96B`
- ItemNFT721: `0x2D5368A2E5a59D365A098520D0BFACE5163D34Dd`
- MagicToken: `0xED8f9B52A6cEc3BB7ee6D43FC34dD09e80E8AEf3`
- CraftingSearch: `0xa6b0840fBF5096C3a49D9BCDf53E137D89167bE3`
- Marketplace: `0x2c4856C30Ffd01944Ad90bf12fFF26f69471a2b3`
- Deployer: `0x110cFb566dF081E2371dFFfB0dDDB5A4C0c7e477`

`deployment.json` contains the same addresses.

## 4. Setup
Requirements
- Node.js ≥ 18

Install
```bash
npm install
```

Environment
```bash
cp .env.example .env
```
Fill in:
```ini
WHITECHAIN_RPC_URL=https://rpc-testnet.whitechain.io
PRIVATE_KEY=0x...
PLAYER_1_KEY=0x...   # optional, used by simulate on testnet
PLAYER_2_KEY=0x...
PLAYER_3_KEY=0x...
```

Build & test
```bash
npm run compile
npm test
npm run test:coverage
```

## 5. Deploy
```bash
npm run deploy
```
- Deploys all contracts.
- Grants roles.
- Writes `deployment.json`.

## 6. Simulate
Testnet (needs 4 funded accounts: deployer + 3 players)
```bash
npm run simulate
```
- Uses `deployment.json`.
- Checks roles; exits with a message if any role is missing.
- Skips `search()` when 60s cooldown is active; continues with admin top‑ups.
- Reads `tokenId` from `ItemCrafted` events.

## 7. Verification
Prefer “Standard JSON” in the explorer.
- Compiler: `0.8.24`
- EVM: `default`
- Optimization: `Enabled`, runs `200`
- License: `MIT`

Export the Standard JSON input for a contract:
```bash
npx ts-node scripts/exportStandardJson.ts ResourceNFT1155
# -> verify/ResourceNFT1155.standard-input.json
```

## 8. Tests & Coverage
Run tests and coverage:
```bash
npm test
npm run test:coverage
```
- Lines/statements/functions: 100%.
- Branches: high (guards like `nonReentrant` are not triggered).

## 9. Layout
```
src/
  ResourceNFT1155.sol
  ItemNFT721.sol
  MagicToken.sol
  CraftingSearch.sol
  Marketplace.sol
scripts/
  deploy.ts
  simulate.ts
  exportStandardJson.ts
verify/                     # standard JSON inputs (generated)
test/
  *.test.ts, fixtures.ts
```
