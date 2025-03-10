const { expect } = require("chai");

describe("RecursiveCall", function () {
    let recursiveCall;
    let owner;
    const MAX_DEPTH = 50;

    beforeEach(async function () {
        [owner] = await ethers.getSigners();
        const RecursiveCall = await ethers.getContractFactory("RecursiveCall");
        recursiveCall = await RecursiveCall.deploy(MAX_DEPTH);
        await recursiveCall.waitForDeployment();
    });

    describe("递归调用测试", function () {
        it("应该能在限制内递归调用", async function () {
            await recursiveCall.recursiveIncrement(1);
            expect(await recursiveCall.counter()).to.equal(MAX_DEPTH);
        });

        it("应该在超过最大深度时回滚", async function () {
            await expect(
                recursiveCall.recursiveIncrement(MAX_DEPTH + 1)
            ).to.be.revertedWithCustomError(
                recursiveCall,
                "MaxDepthExceeded"
            ).withArgs(MAX_DEPTH + 1);
        });

        it("无限递归应该因gas耗尽而失败", async function () {
            await expect(
                recursiveCall.recursiveIncrementUnsafe(1)
            ).to.be.reverted;
        });

        it("迭代实现应该成功执行", async function () {
            await recursiveCall.iterativeIncrement(MAX_DEPTH);
            expect(await recursiveCall.counter()).to.equal(MAX_DEPTH);
        });

        it("迭代实现应该在超过最大深度时失败", async function () {
            await expect(
                recursiveCall.iterativeIncrement(MAX_DEPTH + 1)
            ).to.be.revertedWith("Count exceeds max depth");
        });
    });
}); 