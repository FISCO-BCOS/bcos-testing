const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Block and Tx Properties 测试集", function () {
    let BlockAndTxProperties;
    let blockAndTxProperties;
    let owner;

    before(async function () {
        // 获取签名者  
        [owner] = await ethers.getSigners();
    });

    // 自定义部署函数
    async function deployContract() {
        const BlockTxProperties = await ethers.getContractFactory("BlockTxProperties");
        const blockTxProperties = await BlockTxProperties.deploy();
        await blockTxProperties.waitForDeployment();
        return { blockTxProperties };
    }

    it("测试区块属性记录", async function () {

        const { blockTxProperties } = await deployContract();

        // 调用记录区块属性的函数  
        const tx = await blockTxProperties.updateBlockProperties();
        const receipt = await tx.wait();

        // 可以添加更多断言来验证区块属性  
        console.log("区块属性记录交易回执:", receipt);
        console.log("区块属性记录交易回执logs:", receipt.logs);
    });

    it("测试交易属性记录", async function () {

        const { blockTxProperties } = await deployContract();

        // 调用记录区块属性的函数  
        const tx = await blockTxProperties.updateTransactionProperties();
        const receipt = await tx.wait();

        // 可以添加更多断言来验证区块属性  
        console.log("区块属性记录交易回执:", receipt);
        console.log("区块属性记录交易回执logs:", receipt.logs);
    });
});  