const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("eth_getTransactionCount", function () {
  let testAccount;

  before(async function () {
    [testAccount] = await ethers.getSigners();
  });

  it("should return account nonce", async function () {
    const nonce = await ethers.provider.getTransactionCount(testAccount.address);
    const nonceRaw = await ethers.provider.send("eth_getTransactionCount", [
      testAccount.address,
      "latest"
    ]);

    expect(nonce).to.equal(parseInt(nonceRaw, 16));
  });
});
