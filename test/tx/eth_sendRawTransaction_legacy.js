const { hre, run, network, config } = require("hardhat")
const { ethers } = require("ethers");
const { expect, AssertionError } = require("chai");
const {
  createTransaction
} = require('../../scripts/utils/transactionCreator');
const { TransactionType } = require("../../scripts/utils/transactionType");
const { handleTxError, handleTxOk } = require("../../scripts/utils/transactionHandler");

describe("Legacy Raw Transaction 测试集", async function () {
  // rpc provider  
  let provider;
  // 钱包
  let wallet;
  // 私钥  
  let privateKey;
  // 发送交易账户地址  
  let accountAddress;

  // 存储部署后的合约地址  
  let contractAddress;

  // 存储编译后的合约信息  
  let contractArtifact;
  let contractBytecode;
  let contractAbi;
  let emitEventData;

  this.beforeAll(async function () {
    // 初始化参数
    const chainId = network.config.chainId;
    const url = network.config.url;
    const name = network.name;

    // 私钥 (仅测试环境使用!)  
    const tempPrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    privateKey = config.accounts[0] || tempPrivateKey;
    // === 钱包 ===  
    wallet = new ethers.Wallet(privateKey, null);
    accountAddress = wallet.address;
    console.log(" ### 交易签名私钥 ===>:", privateKey);
    console.log(" ### 交易签名地址 ===>:", wallet.address);

    // 编译合约
    const contractName = "Empty";
    console.log("编译合约:", contractName);
    await run("compile");
    contractArtifact = require(`${config.paths.artifacts}/contracts/${contractName}.sol/${contractName}.json`);
    console.log("合约编译成功");

    // 创建合约ABI接口
    contractBytecode = new ethers.Interface(contractArtifact.abi).encodeFunctionData("emitEvent", []);
    contractAbi = contractArtifact.abi;
    // emitEvent接口abi编码
    emitEventData = new ethers.Interface(contractAbi).encodeFunctionData("emitEvent", []);

    // === rpc provider ===  
    provider = new ethers.JsonRpcProvider(url, { chainId: chainId, name: name }, { staticNetwork: true });
  });

  it("部署合约", async function () {

    // === 步骤: 准备合约部署交易 ===  
    console.log("=== 步骤: 准备合约部署交易 ===");

    // === 步骤: 交易参数 ===  
    const chainId = parseInt(await provider.send('eth_chainId', []), 16);
    const nonce = await provider.getTransactionCount(accountAddress);
    const feeData = await provider.getFeeData();
    const from = accountAddress;
    const to = null; // 合约部署，to为null 
    const value = 0; // 不发送ETH  
    const gasLimit = 22000000n; // 为合约部署设置合适的gas限制  
    const bytecode = contractArtifact.bytecode;  // 获取合约字节码 

    // === 步骤: 创建签名交易 ===  
    const { signedTx, rawTxHash } = createTransaction(
      TransactionType.LegacyTx,
      chainId,
      nonce,
      feeData,
      gasLimit,
      from,
      to,
      value,
      bytecode,
      wallet
    );

    console.log(" ############# ===> rawTxHash", rawTxHash);

    try {
      // === 步骤: 发送交易 ===  
      const txHash = await provider.send("eth_sendRawTransaction", [signedTx]);
      console.log("交易已发送，哈希:", txHash);
      expect(txHash).to.equal(rawTxHash);

      // === 步骤: 等待交易确认 ===  
      const receipt = await provider.waitForTransaction(txHash);
      // console.debug("交易已经执行，回执:", receipt);
      // console.debug("回执 logs:", receipt.logs);

      expect(1).to.equal(receipt.status);
      contractAddress = receipt.contractAddress;

      // 校验from字段
      expect(receipt.from.toLowerCase()).to.equal(accountAddress.toLowerCase());

      await handleTxOk(txHash, accountAddress, provider);

    } catch (error) {

      if (error instanceof AssertionError) {
        throw error
      }

      await handleTxError(rawTxHash, accountAddress, error, provider);
    }
  });

  // 部署合约测试
  it("调用合约接口", async function () {

    const nonce = await provider.getTransactionCount(accountAddress);

    const chainId = parseInt(await provider.send('eth_chainId', []), 16);

    const feeData = await provider.getFeeData();
    const from = accountAddress;
    const to = contractAddress; // 合约部署，to为null 
    const value = 0; // 不发送ETH  
    const gasLimit = 22000000n; // 为合约部署设置合适的gas限制  
    const data = emitEventData;

    // === 步骤: 创建签名交易 ===  
    const { signedTx, rawTxHash } = createTransaction(
      TransactionType.LegacyTx,
      chainId,
      nonce,
      feeData,
      gasLimit,
      from,
      to,
      value,
      data,
      wallet
    );

    try {
      // === 步骤: 发送交易 ===  
      const txHash = await provider.send("eth_sendRawTransaction", [signedTx]);
      console.log("交易已发送，哈希:", txHash);
      expect(txHash).to.equal(rawTxHash);

      // === 步骤: 等待交易确认 ===  
      const receipt = await provider.waitForTransaction(txHash);

      // console.debug("交易已经执行，回执:", receipt);
      // console.debug("回执 logs:", receipt.logs);

      expect(1).to.equal(receipt.status);
      contractAddress = receipt.contractAddress;

      // 校验from字段
      expect(receipt.from.toLowerCase()).to.equal(accountAddress.toLowerCase());

      await handleTxOk(txHash, accountAddress, provider);

    } catch (error) {

      if (error instanceof AssertionError) {
        throw error
      }

      await handleTxError(rawTxHash, accountAddress, error, provider);
    }
  });
  /*

  describe("测试用例: nonce 字段", function () {
    // 移除 async  
    before(async function () {
      // 在这里初始化需要在所有测试之前执行的异步操作  
      this.chainId = parseInt(await provider.send('eth_chainId', []), 16);
      this.feeData = await provider.getFeeData();
      this.from = accountAddress;
      this.to = contractAddress;
      this.value = 0;
      this.gasLimit = 22000000n;
      this.data = emitEventData;
      this.wallet = wallet;
    });

    async function testNonceFieldInvalidCases(nonce, context) {
      // 使用传入的上下文  
      const { chainId, feeData, from, to, value, gasLimit, data, wallet } = context;

      // === 步骤: 创建签名交易 ===  
      const { signedTx } = createTransaction(
        TransactionType.LegacyTx,
        chainId,
        nonce,
        feeData,
        gasLimit,
        from,
        to,
        value,
        data,
        wallet
      );

      try {
        // === 步骤: 发送交易 ===  
        await provider.send("eth_sendRawTransaction", [signedTx]);
        expect(true).to.be.false;
      } catch (error) {
        if (error instanceof AssertionError) {
          throw error;
        }

        const hasSubstring =
          error.message.includes("NonceCheckFail") ||
          error.message.includes("Nonce") ||
          error.message.includes("nonce");

        expect(hasSubstring).to.be.true;
      }
    }

    it("nonce: 回绕", async function () {
      const nonce = await provider.getTransactionCount(accountAddress);
      // 与前一次使用相同的nonce   
      await testNonceFieldInvalidCases(nonce - 1, this);
    });

    it("nonce: 零值", async function () {
      const nonce = 0;
      await testNonceFieldInvalidCases(nonce, this);
    });

    it("nonce: 跳跃", async function () {
      const nonce = await provider.getTransactionCount(accountAddress);
      // 使用比当前nonce大的值  
      await testNonceFieldInvalidCases(nonce + 2, this);
    });

    it("nonce: 非法类型", async function () {
      const invalidNonceList = [
        "",  // 空字符串  
        "HelloWorld，世界你好~！@#￥%……&*（）abcdefghijklmiopq63614101240054722004297811927860191653951076737992592011437881426126469238567698669271990135586095028951356841884186031262120223881211828646342895460926161383537",  // 非法长字符串  
        1.1,  // 浮点数  
        BigInt(1),  // BigInt  
        NaN,  // NaN  
        Infinity,  // Infinity  
        null,  // null  
        undefined,  // undefined  
        [],  // 数组  
        {},  // 对象  
        () => { },  // 函数  
        Symbol(),  // Symbol  
        new Date(),  // Date  
        new Error(),  // Error  
      ];

      for (const nonce of invalidNonceList) {
        await testNonceFieldInvalidCases(nonce, this);
      }
    });

    it("Nonce非法: 重放交易攻击", async function () {
      const nonce = await provider.getTransactionCount(accountAddress);
      // 重复使用相同的nonce发送交易  
      await testNonceFieldInvalidCases(nonce, this);
    });
  });

  describe("测试用例: value 字段", function () {
    // 移除 async  
    before(async function () {
      // 在这里初始化需要在所有测试之前执行的异步操作  
      this.chainId = parseInt(await provider.send('eth_chainId', []), 16);
      this.feeData = await provider.getFeeData();
      this.from = accountAddress;
      this.to = contractAddress;
      this.value = 0;
      this.gasLimit = 22000000n;
      this.data = emitEventData;
      this.wallet = wallet;
    });

    async function testValueFieldInvalidCases(nonce, context) {
      // 使用传入的上下文  
      const { chainId, feeData, from, to, value, gasLimit, data, wallet } = context;

      // === 步骤: 创建签名交易 ===  
      const { signedTx } = createTransaction(
        TransactionType.LegacyTx,
        chainId,
        nonce,
        feeData,
        gasLimit,
        from,
        to,
        value,
        data,
        wallet
      );

      try {
        // === 步骤: 发送交易 ===  
        await provider.send("eth_sendRawTransaction", [signedTx]);
        expect(true).to.be.false;
      } catch (error) {
        if (error instanceof AssertionError) {
          throw error;
        }

        const hasSubstring =
          error.message.includes("NonceCheckFail") ||
          error.message.includes("Nonce") ||
          error.message.includes("nonce");

        expect(hasSubstring).to.be.true;
      }
    }

    it("value: 零值", async function () {
      const nonce = 0;
      await testValueFieldInvalidCases(nonce, this);
    });

    it("value: 负值", async function () {
      const nonce = await provider.getTransactionCount(accountAddress);
      // 使用比当前nonce大的值  
      await testValueFieldInvalidCases(nonce + 2, this);
    });

    it("value: 非法类型", async function () {
      const invalidValueList = [
        "",  // 空字符串  
        "HelloWorld，世界你好~！@#￥%……&*（）abcdefghijklmiopq63614101240054722004297811927860191653951076737992592011437881426126469238567698669271990135586095028951356841884186031262120223881211828646342895460926161383537",  // 非法长字符串  
        1.1,  // 浮点数  
        BigInt(1),  // BigInt  
        NaN,  // NaN  
        Infinity,  // Infinity  
        null,  // null  
        undefined,  // undefined  
        [],  // 数组  
        {},  // 对象  
        () => { },  // 函数  
        Symbol(),  // Symbol  
        new Date(),  // Date  
        new Error(),  // Error  
      ];

      for (const value of invalidValueList) {
        await testNonceFieldInvalidCases(value, this);
      }
    });
  });

  describe("测试用例: to 字段", function () {
    // 移除 async  
    before(async function () {
      // 在这里初始化需要在所有测试之前执行的异步操作  
      this.chainId = parseInt(await provider.send('eth_chainId', []), 16);
      this.feeData = await provider.getFeeData();
      this.from = accountAddress;
      this.to = contractAddress;
      this.value = 0;
      this.gasLimit = 22000000n;
      this.data = emitEventData;
      this.wallet = wallet;
    });

    async function testToFieldInvalidCases(to, context) {
      // 使用传入的上下文  
      const { chainId, feeData, from, to, value, gasLimit, data, wallet } = context;


      nonce = await provider.getTransactionCount(accountAddress);
      // === 步骤: 创建签名交易 ===  
      const { signedTx } = createTransaction(
        TransactionType.LegacyTx,
        chainId,
        nonce,
        feeData,
        gasLimit,
        from,
        to,
        value,
        data,
        wallet
      );

      try {
        // === 步骤: 发送交易 ===  
        await provider.send("eth_sendRawTransaction", [signedTx]);
        expect(true).to.be.false;
      } catch (error) {
        if (error instanceof AssertionError) {
          throw error;
        }

        const hasSubstring =
          error.message.includes("NonceCheckFail") ||
          error.message.includes("Nonce") ||
          error.message.includes("nonce");

        expect(hasSubstring).to.be.true;
      }
    }

    it("value: 零值", async function () {
      const nonce = 0;
      await testToFieldInvalidCases(nonce, this);
    });

    it("value: 负值", async function () {
      const nonce = await provider.getTransactionCount(accountAddress);
      // 使用比当前nonce大的值  
      await testToFieldInvalidCases(nonce + 2, this);
    });

    it("to: 非法类型", async function () {
      const invalidValueList = [
        "",  // 空字符串  
        "HelloWorld，世界你好~！@#￥%……&*（）abcdefghijklmiopq63614101240054722004297811927860191653951076737992592011437881426126469238567698669271990135586095028951356841884186031262120223881211828646342895460926161383537",  // 非法长字符串  
        1.1,  // 浮点数  
        BigInt(1),  // BigInt  
        NaN,  // NaN  
        Infinity,  // Infinity  
        null,  // null  
        undefined,  // undefined  
        [],  // 数组  
        {},  // 对象  
        () => { },  // 函数  
        Symbol(),  // Symbol  
        new Date(),  // Date  
        new Error(),  // Error  
      ];

      for (const value of invalidValueList) {
        await testToFieldInvalidCases(value, this);
      }
    });
  });
  */
}
);
