import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import "./tasks/encode";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    whitechain: {
      url: process.env.WHITECHAIN_RPC_URL || "https://rpc-testnet.whitechain.io",
      // Accounts: deployer + up to 3 players from env
      accounts: [
        process.env.PRIVATE_KEY,
        process.env.PLAYER_1_KEY,
        process.env.PLAYER_2_KEY,
        process.env.PLAYER_3_KEY,
      ].filter((k): k is string => !!k && k.trim().length > 0),
      chainId: 2625, // Whitechain Testnet chain ID
    },
  },
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
};

export default config;
