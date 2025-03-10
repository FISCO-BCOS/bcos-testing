const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HelloWorld", function () {
  let helloWorld;
  let owner;
  let addr1;

  // 在每个测试用例前部署合约
  beforeEach(async function () {
    // 获取测试账户
    [owner] = await ethers.getSigners();

   // 检查账户余额
   const ownerBalance = await ethers.provider.getBalance(owner.address);
   console.log("Owner balance:", ethers.formatEther(ownerBalance));

    // 部署合约
    const HelloWorld = await ethers.getContractFactory("HelloWorld");
    helloWorld = await HelloWorld.deploy();
    await helloWorld.waitForDeployment();  // 等待部署完成

    console.log("HelloWorld deployed to:", await helloWorld.getAddress());
  });

  // 测试初始消息
  describe("Deployment", function () {
    it("Should set the correct initial message", async function () {
      const message = await helloWorld.get();
      expect(message).to.equal("Hello World");
    });
  });

  // 测试设置消息功能
  describe("Set Message", function () {
    it("Should set a new message correctly", async function () {
      const newMessage = "Hello BCOS";
      const tx = await helloWorld.set(newMessage);
      await tx.wait();  // 等待交易确认
      const message = await helloWorld.get();
      expect(message).to.equal(newMessage);
    });
  });

  // 测试获取消息功能
  describe("Get Message", function () {
    it("Should return the correct message after multiple updates", async function () {
         // 检查账户余额
      const ownerBalance = await ethers.provider.getBalance(owner.address);
      console.log("Owner balance:", ethers.formatEther(ownerBalance));

      const messages = ["First Message", "Second Message", "Third Message"];
      for (const message of messages) {
        const tx = await helloWorld.set(message);
        await tx.wait();  // 等待交易确认
        const currentMessage = await helloWorld.get();
        expect(currentMessage).to.equal(message);
      }
    });
  });
}); 