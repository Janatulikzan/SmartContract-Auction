import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";
import "hardhat-gas-reporter";
import "solidity-coverage";

// Baca environment variables jika ada
// Untuk keamanan, gunakan dotenv untuk menyimpan private key dan API keys
// import * as dotenv from "dotenv";
// dotenv.config();

// Private key untuk deployment (JANGAN GUNAKAN PRIVATE KEY ASLI DI SINI)
// Gunakan environment variable: const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";
const PRIVATE_KEY = "0x0000000000000000000000000000000000000000000000000000000000000000";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Jaringan lokal untuk development
    hardhat: {
      chainId: 31337,
    },
    // Konfigurasi untuk localhost (untuk menjalankan node Hardhat)
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    // Konfigurasi untuk jaringan Monad testnet
    monadTestnet: {
      url: "https://rpc.testnet.monad.xyz/", // Ganti dengan RPC URL yang benar
      accounts: [PRIVATE_KEY],
      chainId: 1286, // Chain ID untuk Monad testnet
    },
    // Konfigurasi untuk jaringan Monad mainnet
    monad: {
      url: "https://rpc.monad.xyz/", // Ganti dengan RPC URL yang benar
      accounts: [PRIVATE_KEY],
      chainId: 1284, // Chain ID untuk Monad mainnet
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: {
      // Tambahkan API key untuk verifikasi kontrak jika diperlukan
      monadTestnet: "YOUR_MONAD_API_KEY",
      monad: "YOUR_MONAD_API_KEY",
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
