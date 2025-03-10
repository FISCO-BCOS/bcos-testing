const { expect } = require("chai");

describe("TransactionRevert", function () {
    let transactionRevert;
    let owner;

    beforeEach(async function () {
        [owner] = await ethers.getSigners();
        const TransactionRevert = await ethers.getContractFactory("TransactionRevert");
        transactionRevert = await TransactionRevert.deploy();
        await transactionRevert.waitForDeployment();
    });

    describe("交易回滚和事件清空测试", function () {
        it("正常交易应该成功并触发事件", async function () {
            await expect(transactionRevert.setValue(42))
                .to.emit(transactionRevert, "ValueSet")
                .withArgs(0, 42);
                
            expect(await transactionRevert.value()).to.equal(42);
        });

        it("回滚的交易应该恢复状态并清空事件", async function () {
            // 设置初始值
            await transactionRevert.setValue(42);
            
            // 捕获交易并检查事件
            let eventFired = false;
            console.log("eventFired:", eventFired);   
            
            try {
                // 尝试执行会回滚的交易
                const tx = await transactionRevert.setValueAndRevert(100);
                
                // 获取交易收据
                const receipt = await tx.wait();
                
                // 检查是否有BeforeRevert事件
                console.log("receipt:", receipt);
                for (const log of receipt.logs) {
                    try {
                        const event = transactionRevert.interface.parseLog(log);
                        console.log("event1:", event);
                        if (event.name === "BeforeRevert") {
                            eventFired = true;
                        }
                    } catch (e) {
                        // 解析日志失败，可能不是我们的合约事件
                    }
                }
            } catch (error) {
                // 预期会抛出异常
                console.log("交易回滚，错误信息:", error.message);
                
                // 验证交易回滚后事件不会被记录
                expect(eventFired).to.equal(false, "回滚的交易不应该有事件被记录");
            }
            
            // 验证值没有改变
            expect(await transactionRevert.value()).to.equal(42);
            
            // 再次执行一个成功的交易，验证事件正常触发
            const successTx = await transactionRevert.setValue(50);
            const successReceipt = await successTx.wait();
            
            // 验证成功交易的事件被记录
            let successEventFound = false;
            for (const log of successReceipt.logs) {
                try {
                    const event = transactionRevert.interface.parseLog(log);
                    console.log("event2:", event);
                    if (event.name === "ValueSet") {
                        successEventFound = true;
                        expect(event.args[0]).to.equal(42); // oldValue
                        expect(event.args[1]).to.equal(50); // newValue
                    }
                } catch (e) {
                    // 解析日志失败，可能不是我们的合约事件
                }
            }
            
            expect(successEventFound).to.equal(true, "成功的交易应该有事件被记录");
        });

        it("条件回滚应该根据条件决定是否提交", async function () {
            // 不回滚的情况
            await expect(transactionRevert.conditionalRevert(42, false))
                .to.emit(transactionRevert, "ValueSet")
                .withArgs(0, 42);
                
            // 回滚的情况
            await expect(
                transactionRevert.conditionalRevert(100, true)
            ).to.be.revertedWith("Conditional revert");
            
            // 验证值保持在最后一次成功的交易
            expect(await transactionRevert.value()).to.equal(42);
        });
    });
}); 