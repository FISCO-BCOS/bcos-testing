const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("FallbackReceive", function () {
    let fallbackReceive;
    let owner;
    let user1;
    let user2;
    
    // 测试用的ETH金额
    const ONE_ETHER = ethers.parseEther("1.0");
    const HALF_ETHER = ethers.parseEther("0.5");
    
    beforeEach(async function () {
        [owner] = await ethers.getSigners();
        user1 = owner;
        user2 = owner;
        
        // 部署合约，发送1 ETH
        const FallbackReceive = await ethers.getContractFactory("FallbackReceive");
        fallbackReceive = await FallbackReceive.deploy({ value: ONE_ETHER });
        await fallbackReceive.waitForDeployment();
        
        console.log("合约部署地址:", await fallbackReceive.getAddress());
    });
    
    describe("基本功能测试", function () {
        it("应该正确初始化合约", async function () {
            const contractInfo = await fallbackReceive.getContractInfo();
            
            expect(contractInfo[0]).to.equal(ONE_ETHER); // lastValueReceived
            expect(contractInfo[4]).to.equal(ONE_ETHER); // totalReceived
            expect(contractInfo[5]).to.equal(ONE_ETHER); // balance
        });
        
        it("应该能通过 deposit 函数接收 ETH", async function () {
            // 调用 deposit 函数发送 ETH
            await fallbackReceive.connect(user1).deposit({ value: HALF_ETHER });
            
            const contractInfo = await fallbackReceive.getContractInfo();
            
            expect(contractInfo[0]).to.equal(HALF_ETHER); // lastValueReceived
            expect(contractInfo[1]).to.equal("deposit"); // lastFunctionCalled
            expect(contractInfo[2]).to.equal(user1.address); // lastCaller
            expect(contractInfo[4]).to.equal(ONE_ETHER + HALF_ETHER); // totalReceived
            expect(contractInfo[5]).to.equal(ONE_ETHER + HALF_ETHER); // balance
        });
    });
    
    describe("receive 函数测试", function () {
        it("应该通过 receive 函数处理纯 ETH 转账", async function () {
            // 直接发送 ETH 到合约地址
            await user1.sendTransaction({
                to: await fallbackReceive.getAddress(),
                value: HALF_ETHER
            });
            
            const contractInfo = await fallbackReceive.getContractInfo();
            
            expect(contractInfo[0]).to.equal(HALF_ETHER); // lastValueReceived
            expect(contractInfo[1]).to.equal("receive"); // lastFunctionCalled
            expect(contractInfo[2]).to.equal(user1.address); // lastCaller
            expect(contractInfo[4]).to.equal(ONE_ETHER + HALF_ETHER); // totalReceived
        });
        
        it("应该能触发 Received 事件", async function () {
            // 监听事件
            await expect(user1.sendTransaction({
                to: await fallbackReceive.getAddress(),
                value: HALF_ETHER
            }))
            .to.emit(fallbackReceive, "Received")
            .withArgs(user1.address, HALF_ETHER, "receive");
        });
    });
    
    describe("fallback 函数测试", function () {
        it("应该通过 fallback 函数处理未知函数调用", async function () {
            // 创建一个不存在的函数调用
            const nonExistentFunctionData = ethers.keccak256(ethers.toUtf8Bytes("nonExistentFunction()")).slice(0, 10);
            console.log("nonExistentFunctionData:", nonExistentFunctionData);
            await user1.sendTransaction({
                to: await fallbackReceive.getAddress(),
                data: nonExistentFunctionData,
                value: HALF_ETHER
            });
            
            const contractInfo = await fallbackReceive.getContractInfo();
            
            expect(contractInfo[0]).to.equal(HALF_ETHER); // lastValueReceived
            expect(contractInfo[1]).to.equal("fallback"); // lastFunctionCalled
            expect(contractInfo[2]).to.equal(user1.address); // lastCaller
            // 注意：lastData 可能包含前缀，所以我们检查它是否包含我们的数据
            expect(ethers.hexlify(contractInfo[3])).to.include(nonExistentFunctionData.slice(2));
        });
        
        it("应该能触发 FallbackCalled 事件", async function () {
            const nonExistentFunctionData = ethers.keccak256(ethers.toUtf8Bytes("nonExistentFunction()")).slice(0, 10);
            
            await expect(user1.sendTransaction({
                to: await fallbackReceive.getAddress(),
                data: nonExistentFunctionData,
                value: HALF_ETHER
            }))
            .to.emit(fallbackReceive, "FallbackCalled");
        });
    });
    
    describe("staticcall 测试", function () {
        it("应该能通过 staticcall 调用 view 函数", async function () {
            // 创建 getContractBalance 函数的调用数据
            const getBalanceData = ethers.id("getContractBalance()").slice(0, 10);
            console.log("getBalanceData:", getBalanceData);
            
            // 使用 testStaticCall 函数进行 staticcall
            const result = await fallbackReceive.testStaticCall(
                await fallbackReceive.getAddress(),
                getBalanceData
            );
            
            expect(result[0]).to.be.true; // success
            
            // 解码返回数据
            const decodedBalance = ethers.AbiCoder.defaultAbiCoder().decode(
                ["uint256"],
                result[1]
            )[0];
            
            expect(decodedBalance).to.equal(ONE_ETHER);
        });
        
        it("应该无法通过 staticcall 调用非 view 函数", async function () {
            // 创建 updateState 函数的调用数据
            const functionSignature = "updateState(string)";
            const functionSelector = ethers.id(functionSignature).slice(0, 10);
            const encodedParam = ethers.AbiCoder.defaultAbiCoder().encode(
                ["string"],
                ["testStaticCall"]
            ).slice(2);
            const updateStateData = functionSelector + encodedParam;
            
            // 使用 testStaticCall 函数进行 staticcall
            const result = await fallbackReceive.testStaticCall(
                await fallbackReceive.getAddress(),
                updateStateData
            );
            
            expect(result[0]).to.be.false; // success should be false
        });
    });
    
    describe("payable 测试", function () {
        it("应该能通过多种方式接收 ETH", async function () {
            // 1. 通过 deposit 函数
            await fallbackReceive.connect(user1).deposit({ value: HALF_ETHER });
            
            // 2. 通过 receive 函数
            await user2.sendTransaction({
                to: await fallbackReceive.getAddress(),
                value: HALF_ETHER
            });
            
            // 验证总余额
            const balance = await ethers.provider.getBalance(await fallbackReceive.getAddress());
            expect(balance).to.equal(ONE_ETHER + HALF_ETHER + HALF_ETHER);
        });
        
        it("应该能提取合约余额", async function () {
            const initialOwnerBalance = await ethers.provider.getBalance(owner.address);
            
            // 提取合约余额
            const tx = await fallbackReceive.withdraw();
            const receipt = await tx.wait();
            
            // 计算 gas 成本
            const gasCost = receipt.gasUsed * receipt.gasPrice;
            
            // 验证合约余额为 0
            const contractBalance = await ethers.provider.getBalance(await fallbackReceive.getAddress());
            expect(contractBalance).to.equal(0);
            
            // 验证所有者余额增加（减去 gas 成本）
            const finalOwnerBalance = await ethers.provider.getBalance(owner.address);
            expect(finalOwnerBalance).to.be.closeTo(
                initialOwnerBalance + ONE_ETHER - gasCost,
                ethers.parseEther("0.01") // 允许小误差
            );
        });
    });
    
    describe("综合测试", function () {
        it("应该能正确跟踪所有交互", async function () {
            // 1. 通过 deposit 发送 ETH
            await fallbackReceive.connect(user1).deposit({ value: HALF_ETHER });
            
            // 2. 更新状态
            await fallbackReceive.connect(user2).updateState("testFunction");
            
            // 3. 通过 receive 发送 ETH
            await user1.sendTransaction({
                to: await fallbackReceive.getAddress(),
                value: HALF_ETHER
            });
            
            // 验证最终状态
            const contractInfo = await fallbackReceive.getContractInfo();
            
            expect(contractInfo[0]).to.equal(HALF_ETHER); // lastValueReceived
            expect(contractInfo[1]).to.equal("receive"); // lastFunctionCalled
            expect(contractInfo[2]).to.equal(user1.address); // lastCaller
            expect(contractInfo[4]).to.equal(ONE_ETHER + HALF_ETHER + HALF_ETHER); // totalReceived
            expect(contractInfo[5]).to.equal(ONE_ETHER + HALF_ETHER + HALF_ETHER); // balance
        });
    });
}); 