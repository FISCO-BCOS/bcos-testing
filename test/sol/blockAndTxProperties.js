const { expect } = require("chai");
const { ethers } = require("hardhat");

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

    it("部署合约", async function () {
        // 部署合约  
        blockAndTxProperties = await BlockAndTxProperties.deploy();

        // 等待部署交易确认  
        const receipt = await blockAndTxProperties.deployTransaction.wait();

        // 验证合约地址  
        expect(receipt.contractAddress).to.not.be.undefined;
        console.log("合约已部署，地址:", receipt.contractAddress);
    });

    it("测试区块属性记录", async function () {
        // 调用记录区块属性的函数  
        const tx = await blockAndTxProperties.recordBlockProperties();
        const receipt = await tx.wait();

        // 可以添加更多断言来验证区块属性  
        console.log("区块属性记录交易 Gas 消耗:", receipt.gasUsed.toString());
    });

    it("测试交易属性记录", async function () {
        // 发送一个带有一些 ETH 的交易  
        const tx = await blockAndTxProperties.recordTransactionProperties({
            value: ethers.parseEther("0.1")  // 发送 0.1 ETH  
        });
        const receipt = await tx.wait();

        console.log("交易属性记录交易 Gas 消耗:", receipt.gasUsed.toString());
    });
});  