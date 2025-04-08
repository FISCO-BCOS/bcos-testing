const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BlockInfo", function () {
    let blockInfo;
    let owner;
    let chainId;

    beforeEach(async function () {
        [owner] = await ethers.getSigners();
        // 检查账户余额
        const ownerBalance = await ethers.provider.getBalance(owner.address);
        console.log("Owner balance:", ethers.formatEther(ownerBalance));

        const BlockInfo = await ethers.getContractFactory("BlockInfo");
        blockInfo = await BlockInfo.deploy();
        await blockInfo.waitForDeployment();

        chainId = (await ethers.provider.getNetwork()).chainId;

        console.log("合约部署地址:", await blockInfo.getAddress());
        console.log("链id: " + chainId);
    });

    describe("区块信息测试", function () {
        it("应该能正确获取区块信息", async function () {
            const tx = await blockInfo.captureBlockInfo();
            const receipt = await tx.wait();

            const blockData = await blockInfo.getLastBlockInfo();

            console.log("\n=== 区块信息 ===");
            console.log("区块号:", blockData.number.toString());
            console.log("时间戳timestamp:", blockData.timestamp);
            console.log("时间戳:", new Date(Number(blockData.timestamp) * 1000).toLocaleString());
            console.log("矿工地址:", blockData.coinbase);
            console.log("难度:", blockData.difficulty.toString());
            console.log("Gas限制:", blockData.gaslimit.toString());
            console.log("链ID:", blockData.chainid.toString());
            console.log("基础费用:", blockData.basefee.toString());
            console.log("随机数:", blockData.prevrandao.toString());
            console.log("Blob哈希:", blockData.blobhash);

            // 验证时间戳是否为有效值
            expect(blockData.timestamp).to.be.gt(0);
            // 验证矿工地址是否为有效的以太坊地址
            expect(ethers.isAddress(blockData.coinbase)).to.be.true;
            expect(blockData.coinbase).to.equal("0x0000000000000000000000000000000000000000");
            // 验证难度是否大于0
            expect(blockData.difficulty).to.be.gte(0);
            // 验证Gas限制是否大于0
            expect(blockData.gaslimit).to.be.gt(0);
            // 验证基础费用是否大于等于0
            expect(blockData.basefee).to.be.gte(0);
            // 验证随机数是否存在
            expect(blockData.prevrandao).to.equal(0);
            // 验证区块号是否正确
            expect(blockData.number).to.equal(receipt.blockNumber);
            // 验证chainId是否正确
            expect(blockData.chainid).to.equal(chainId); // FISCO BCOS的chainId

            // 验证Blob哈希
            expect(blockData.blobhash).to.match(/^0x[0-9a-f]{64}$/i);
        });

        it("应该能正确获取连续区块的Blob哈希", async function () {
            // 第一次调用
            const tx1 = await blockInfo.captureBlockInfo();
            await tx1.wait();
            const blockData1 = await blockInfo.getLastBlockInfo();

            // 第二次调用
            const tx2 = await blockInfo.captureBlockInfo();
            await tx2.wait();
            const blockData2 = await blockInfo.getLastBlockInfo();

            // 验证两次的Blob哈希都是有效的bytes32值
            expect(blockData1.blobhash).to.match(/^0x[0-9a-f]{64}$/i);
            expect(blockData2.blobhash).to.match(/^0x[0-9a-f]{64}$/i);
        });

        it("应该能正确获取调用信息", async function () {
            const value = ethers.parseEther("1.0");
            const tx = await blockInfo.captureCallInfo({ value: value });
            const receipt = await tx.wait();

            const callData = await blockInfo.getLastCallInfo();

            console.log("\n=== 调用信息 ===");
            console.log("调用者地址:", callData.msgSender);
            console.log("交易发起者:", callData.txOrigin);
            console.log("调用函数签名:", callData.msgSig);
            console.log("调用值:", ethers.formatEther(callData.msgValue));
            console.log("调用数据:", callData.msgData);
            console.log("剩余Gas:", callData.gasLeft.toString());
            console.log("Gas价格:", callData.gasPrice.toString());

            // 验证调用者地址
            expect(callData.msgSender).to.equal(owner.address);
            // 验证交易发起者地址
            expect(callData.txOrigin).to.equal(owner.address);
            // 验证函数签名 (captureCallInfo的函数签名)
            expect(callData.msgSig).to.equal("0x5cce3cb6");
            // 验证调用值
            expect(callData.msgValue).to.equal(value);
            // 验证调用数据不为空
            expect(callData.msgData).to.not.equal("0x");
            expect(callData.msgData.length).to.be.greaterThan(2);
            // 验证剩余Gas大于0
            expect(callData.gasLeft).to.be.gt(0);
            // 验证Gas价格大于0
            expect(callData.gasPrice).to.be.gt(0);
        });
    });
}); 