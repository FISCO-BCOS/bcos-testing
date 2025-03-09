const { expect } = require("chai");

describe("DivisionByZero", function () {
    let divisionByZero;
    let owner;

    beforeEach(async function () {
        [owner] = await ethers.getSigners();
        const DivisionByZero = await ethers.getContractFactory("DivisionByZero");
        divisionByZero = await DivisionByZero.deploy();
        await divisionByZero.waitForDeployment();
    });

    describe("除零异常测试", function () {
        it("应该在除数为0时抛出异常", async function () {
            await expect(
                divisionByZero.divide(10, 0)
            ).to.be.revertedWithPanic(0x12); // 0x12 是除零错误的错误码
        });

        it("应该在除数为0时通过require检查抛出自定义异常", async function () {
            await expect(
                divisionByZero.divideWithCheck(10, 0)
            ).to.be.revertedWith("Denominator cannot be zero");
        });

        it("正常除法应该成功并触发事件", async function () {
            await expect(divisionByZero.divide(10, 2))
                .to.emit(divisionByZero, "Division")
                .withArgs(10, 2, 5);

            expect(await divisionByZero.result()).to.equal(5);
        });
    });
}); 