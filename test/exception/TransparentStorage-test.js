const { expect } = require("chai");

describe("TransparentStorage", function () {
    let logicV1;
    let logicV2;
    let proxy;
    let proxyAsV1;
    let proxyAsV2;
    let owner;

    beforeEach(async function () {
        [owner] = await ethers.getSigners();
        
        // 部署两个版本的实现合约
        const LogicV1 = await ethers.getContractFactory("LogicV1");
        logicV1 = await LogicV1.deploy();
        await logicV1.waitForDeployment();
        
        const LogicV2 = await ethers.getContractFactory("LogicV2");
        logicV2 = await LogicV2.deploy();
        await logicV2.waitForDeployment();
        
        // 部署代理合约，指向V1实现
        const TransparentProxy = await ethers.getContractFactory("TransparentProxy");
        proxy = await TransparentProxy.deploy(await logicV1.getAddress());
        await proxy.waitForDeployment();
        
        // 创建代理合约的接口
        proxyAsV1 = LogicV1.attach(await proxy.getAddress());
        proxyAsV2 = LogicV2.attach(await proxy.getAddress());
    });

    describe("透明代理测试", function () {
        it("应该能通过代理设置和读取值", async function () {
            // 测试基本的存储和读取功能
            await proxyAsV1.setValue(42);
            expect(await proxyAsV1.value()).to.equal(42);
        });

        it("应该能升级到新版本并保持状态", async function () {
            // 设置初始值
            await proxyAsV1.setValue(42);
            
            // 升级到V2
            await proxy.setImplementation(await logicV2.getAddress());
            
            // 验证旧值保持不变
            expect(await proxyAsV2.value()).to.equal(42);
            
            // 测试新功能
            await proxyAsV2.setVersion("2.0.0");
            expect(await proxyAsV2.version()).to.equal("2.0.0");
        });

        it("应该在实现地址为零时回滚", async function () {
            // 测试安全检查
            await expect(
                proxy.setImplementation(ethers.ZeroAddress)
            ).to.be.revertedWith("Invalid implementation address");
        });
    });
}); 