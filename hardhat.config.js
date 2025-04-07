require("@nomicfoundation/hardhat-toolbox");
// require("./scripts/tasks/list-tests")
require("dotenv").config();

const BCOSNET_URL = process.env.BCOS_HOST_URL || "";
const MAINNET_URL = process.env.MAINNET_URL || "";
const SEPOLIA_URL = process.env.SEPOLIA_URL || "";
const GOERLI_URL = process.env.GOERLI_URL || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY.length > 0 ? process.env.PRIVATE_KEY.split(',') : [];

console.log("PRIVATE_KEY:", PRIVATE_KEY);
console.log("BCOSNET_URL:", BCOSNET_URL);

/** @type {import('hardhat/config').HardhatUserConfig} */
const config = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun",
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  paths: {
    sources: "./contracts"
  },

  accounts: PRIVATE_KEY.length > 0 ? [PRIVATE_KEY[0]] : [],

  defaultNetwork: "hardhat",

  networks: {
    bcosnet: {
      url: BCOSNET_URL,
      accounts: PRIVATE_KEY.length > 0 ? [PRIVATE_KEY[0]] : [],
      chainId: 20200
    },
    // 以太坊主网配置
    mainnet: {
      url: MAINNET_URL || "https://mainnet.infura.io/v3/your-api-key",
      accounts: PRIVATE_KEY.length > 0 ? [PRIVATE_KEY[0]] : [],
      chainId: 1,
    },
    // Sepolia测试网配置
    sepolia: {
      url: SEPOLIA_URL || "https://sepolia.infura.io/v3/your-api-key",
      accounts: PRIVATE_KEY.length > 0 ? [PRIVATE_KEY[0]] : [],
      chainId: 11155111,
    },
    // Goerli测试网配置
    goerli: {
      url: GOERLI_URL || "https://goerli.infura.io/v3/your-api-key",
      accounts: PRIVATE_KEY.length > 0 ? [PRIVATE_KEY[0]] : [],
      chainId: 5,
    },
    // hardhat内置测试网络
    hardhat: {
      allowUnlimitedContractSize: true,  // 允许无限制的合约大小
      gas: 30000000,                     // 设置更高的 gas 限制
      blockGasLimit: 30000000
    }
  }
};

module.exports = config;
