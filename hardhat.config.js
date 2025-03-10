require("@nomicfoundation/hardhat-toolbox");
require("./tasks/block-number")
require("./tasks/list-tests")
// require("hardhat-docgen");
require("dotenv").config();

const LOCAL_URL = process.env.LOCAL_HOST_URL || "";
const BCOSNET_URL = process.env.BCOS_HOST_URL || "";
const MAINNET_URL = process.env.MAINNET_URL || "";
const SEPOLIA_URL = process.env.SEPOLIA_URL || "";
const GOERLI_URL = process.env.GOERLI_URL || "";
const PRIVATE_KEY = process.env.PRIVATE_KEY.length > 0 ? process.env.PRIVATE_KEY.split(',') : [];

console.log(" :", PRIVATE_KEY);
console.log("BCOSNET_URL:", BCOSNET_URL);

/** @type {import('hardhat/config').HardhatUserConfig} */
const config = {

  mocha: {
    // 全局超时时间（毫秒）  
    timeout: 60000  // 60秒  
  },

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
  defaultNetwork: "hardhat",
  networks: {
    bcosnet: {
      url: BCOSNET_URL,
      accounts: PRIVATE_KEY.length > 0 ? PRIVATE_KEY : [
        "b0b9d33d8558ffb74cfa501426a1652bd4cb3452d49faad9b235c42f66d39e33",
        "82e8df71b5066e0fd42c527317fba6ba5f6b60c5546e92c904efeaa8ec6a2d59",
        "5ab8223a7b6656e939a4ebf233e3bcf8e230163d4048b9cb6380e1d9ad555ba9",
        "5ab8223a7b6656e939a4ebf233e3bcf8e230163d4048b9cb6380e1d9ad555ba9"
      ],
      chainId: 20200
    },

    localnet: {
      url: LOCAL_URL,
      accounts: PRIVATE_KEY.length > 0 ? PRIVATE_KEY : [
        "b0b9d33d8558ffb74cfa501426a1652bd4cb3452d49faad9b235c42f66d39e33",
        "82e8df71b5066e0fd42c527317fba6ba5f6b60c5546e92c904efeaa8ec6a2d59",
        "5ab8223a7b6656e939a4ebf233e3bcf8e230163d4048b9cb6380e1d9ad555ba9",
        "5ab8223a7b6656e939a4ebf233e3bcf8e230163d4048b9cb6380e1d9ad555ba9"
      ],
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
      accounts: PRIVATE_KEY.length > 0 ? PRIVATE_KEY : [
        "b0b9d33d8558ffb74cfa501426a1652bd4cb3452d49faad9b235c42f66d39e33",
        "82e8df71b5066e0fd42c527317fba6ba5f6b60c5546e92c904efeaa8ec6a2d59",
        "5ab8223a7b6656e939a4ebf233e3bcf8e230163d4048b9cb6380e1d9ad555ba9",
        "5ab8223a7b6656e939a4ebf233e3bcf8e230163d4048b9cb6380e1d9ad555ba9"
      ],
      chainId: 11155111,
    },
    // Goerli测试网配置
    goerli: {
      url: GOERLI_URL || "https://goerli.infura.io/v3/your-api-key",
      accounts: PRIVATE_KEY.length > 0 ? PRIVATE_KEY : [
        "b0b9d33d8558ffb74cfa501426a1652bd4cb3452d49faad9b235c42f66d39e33",
        "82e8df71b5066e0fd42c527317fba6ba5f6b60c5546e92c904efeaa8ec6a2d59",
        "5ab8223a7b6656e939a4ebf233e3bcf8e230163d4048b9cb6380e1d9ad555ba9",
        "5ab8223a7b6656e939a4ebf233e3bcf8e230163d4048b9cb6380e1d9ad555ba9"
      ],
      chainId: 5
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
