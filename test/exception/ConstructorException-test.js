const { expect } = require("chai");

describe("ConstructorException", function () {
    let ConstructorException;
    let owner;

    beforeEach(async function () {
        [owner] = await ethers.getSigners();
        ConstructorException = await ethers.getContractFactory("ConstructorException");
    });

    describe("构造函数异常参数测试", function () {
        it("应该在最小值为0时部署失败", async function () {
            await expect(
                ConstructorException.deploy(0, owner.address, "Test")
            ).to.be.revertedWithCustomError(
                ConstructorException,
                "InvalidMinimumValue"
            ).withArgs(0);
        });

        it("应该在所有者地址为零地址时部署失败", async function () {
            await expect(
                ConstructorException.deploy(100, ethers.ZeroAddress, "Test")
            ).to.be.revertedWithCustomError(
                ConstructorException,
                "InvalidOwnerAddress"
            );
        });

        it("应该在名称为空时部署失败", async function () {
            await expect(
                ConstructorException.deploy(100, owner.address, "")
            ).to.be.revertedWithCustomError(
                ConstructorException,
                "InvalidNameLength"
            ).withArgs(0);
        });

        it("应该在名称过长时部署失败", async function () {
            const longName = "a".repeat(33);
            await expect(
                ConstructorException.deploy(100, owner.address, longName)
            ).to.be.revertedWithCustomError(
                ConstructorException,
                "InvalidNameLength"
            ).withArgs(33);
        });

        it("应该使用有效参数成功部署", async function () {
            const contract = await ConstructorException.deploy(100, owner.address, "Test");
            await contract.waitForDeployment();
            
            expect(await contract.minimumValue()).to.equal(100);
            expect(await contract.owner()).to.equal(owner.address);
            expect(await contract.name()).to.equal("Test");
        });
    });
}); 