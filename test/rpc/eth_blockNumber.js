const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("eth_blockNumber", function () {
  it("should return current block number", async function () {
    // 直接使用ethers.js的provider调用接口
    const blockNumber = await ethers.provider.getBlockNumber();

    // 也可以使用原始RPC调用
    const blockNumberRaw = await ethers.provider.send("eth_blockNumber", []);

    console.log(`Current block number: ${blockNumber}`);
    console.log(`Current block number (raw): ${parseInt(blockNumberRaw, 16)}`);

    // 验证结果
    expect(blockNumber).to.be.a("number");
    expect(blockNumber).to.equal(parseInt(blockNumberRaw, 16));
  });
});
