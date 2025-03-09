const { expect } = require("chai");

describe("Overflow", function () {
    let overflow;
    let owner;

    beforeEach(async function () {
        [owner] = await ethers.getSigners();
        const Overflow = await ethers.getContractFactory("Overflow");
        overflow = await Overflow.deploy();
        await overflow.waitForDeployment();
    });

    describe("数值溢出测试", function () {
        it("应该在uint8溢出时抛出异常", async function () {
            await overflow.increment(255);  // 这个会成功
            await expect(
                overflow.increment(1)
            ).to.be.revertedWithPanic(0x11); // 0x11 是算术溢出的错误码
        });

        it("使用unchecked时应该允许溢出", async function () {
            await overflow.unsafeIncrement(255);  // 设置为最大值
            await overflow.unsafeIncrement(1);    // 溢出到0
            expect(await overflow.smallNumber()).to.equal(0);
        });

        it("正常加法应该成功并触发事件", async function () {
            await expect(overflow.increment(5))
                .to.emit(overflow, "NumberChanged")
                .withArgs(0, 5);

            expect(await overflow.smallNumber()).to.equal(5);
        });
    });
}); 