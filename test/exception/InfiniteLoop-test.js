const { expect } = require("chai");

describe("InfiniteLoop", function () {
    let infiniteLoop;
    let owner;

    beforeEach(async function () {
        [owner] = await ethers.getSigners();
        const InfiniteLoop = await ethers.getContractFactory("InfiniteLoop");
        infiniteLoop = await InfiniteLoop.deploy();
        await infiniteLoop.waitForDeployment();
    });

    describe("死循环测试", function () {
        it("应该在无限循环时耗尽gas", async function () {
            await expect(
                infiniteLoop.infiniteLoop()
            ).to.be.reverted;
        });

        it("应该能执行有限次数的循环", async function () {
            await infiniteLoop.controlledLoop(5);
            expect(await infiniteLoop.counter()).to.equal(5);
        });

        it("应该在gas不足时提前结束循环", async function () {
            // 设置一个较大的循环次数，但gas会限制实际执行次数
            await infiniteLoop.safeLoop(1000000);
            const finalCounter = await infiniteLoop.counter();
            expect(finalCounter).to.be.lt(1000000);
            console.log("实际执行次数:", finalCounter.toString());
        });
    });
}); 