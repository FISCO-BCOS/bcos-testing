const { expect } = require("chai");

describe("GasDeduction", function () {
    let gasDeduction;
    let owner;

    beforeEach(async function () {
        [owner] = await ethers.getSigners();
        const GasDeduction = await ethers.getContractFactory("GasDeduction");
        gasDeduction = await GasDeduction.deploy();
        await gasDeduction.waitForDeployment();
    });

    describe("Gas扣除测试", function () {
        it("应该正确消耗gas并继续执行", async function () {
            const tx = await gasDeduction.consumeGas(100);
            const receipt = await tx.wait();
            
            // 验证交易成功执行
            expect(receipt.status).to.equal(1);
            
            // 验证value增加了正确的次数
            expect(await gasDeduction.value()).to.equal(100);
        });

        // TODO: Fix with eth_estimateGas
        // it("即使交易回滚也应该扣除gas", async function () {
        //     const balanceBefore = await ethers.provider.getBalance(owner.address);
        //     console.log("balanceBefore:", balanceBefore);
        //     try {
        //         await gasDeduction.consumeGasAndRevert(100);
        //     } catch (error) {
        //         // 预期会抛出异常
        //     }
            
        //     const balanceAfter = await ethers.provider.getBalance(owner.address);
        //     console.log("balanceAfter:", balanceAfter);
            
        //     // 验证gas被扣除（余额减少）
        //     expect(balanceAfter).to.be.lt(balanceBefore);
            
        //     // 验证value没有改变（交易回滚）
        //     expect(await gasDeduction.value()).to.equal(0);
        // });

        it("应该能查询剩余gas", async function () {
            const gasLeft = await gasDeduction.checkGasLeft();
            console.log("gasLeft:", gasLeft);
            expect(gasLeft).to.be.gt(0);
        });
    });
}); 