const { expect } = require("chai");
const { ethers } = require("hardhat");

const {
    loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Block and Tx Properties 测试集", function () {
    let BlockAndTxProperties;
    let blockAndTxProperties;
    let owner;

    before(async function () {
        // 获取签名者  
        [owner] = await ethers.getSigners();

        // 编译合约  
        BlockAndTxProperties = await ethers.getContractFactory("BlockTxProperties");
    });

    async function deployBlockAndTxPropertiesFixture() {
        // const ONE_YEAR_IN_SECS = 365 * 24 * 60 * 60;
        // const ONE_GWEI = 1_000_000_000;

        // const lockedAmount = ONE_GWEI;
        // const unlockTime = (await time.latest()) + ONE_YEAR_IN_SECS;

        // Contracts are deployed using the first signer/account by default
        const [owner, otherAccount] = await ethers.getSigners();

        const BlockTxProperties = await ethers.getContractFactory("BlockTxProperties");
        const blockTxProperties = await BlockTxProperties.deploy();

        return { blockTxProperties };
    }

    it("测试区块属性记录", async function () {

        const { blockTxProperties } = await loadFixture(
            deployBlockAndTxPropertiesFixture
        );

        // 调用记录区块属性的函数  
        const tx = await blockTxProperties.updateBlockProperties();
        const receipt = await tx.wait();

        // 可以添加更多断言来验证区块属性  
        console.log("区块属性记录交易回执:", receipt);
        console.log("区块属性记录交易回执logs:", receipt.logs);
    });

    it("测试交易属性记录", async function () {

        const { blockTxProperties } = await loadFixture(
            deployBlockAndTxPropertiesFixture
        );

        // 调用记录区块属性的函数  
        const tx = await blockTxProperties.updateTransactionProperties();
        const receipt = await tx.wait();

        // 可以添加更多断言来验证区块属性  
        console.log("区块属性记录交易回执:", receipt);
        console.log("区块属性记录交易回执logs:", receipt.logs);
    });
});  