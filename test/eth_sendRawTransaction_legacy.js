const { run, network, config } = require("hardhat")
const { ethers } = require("ethers");
const { expect, AssertionError } = require("chai");
const { keccak256 } = require("ethereum-cryptography/keccak");
const { bytesToHex } = require("ethereum-cryptography/utils");
const RLP = require("@ethereumjs/rlp");
// const {
//   parseSignedTransaction
// } = require('../scripts/utils/transactionParser');

describe("Legacy Raw Transaction 测试集", function () {
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
    // 打印网络信息
    // console.log(" ### ===> network", network);

    // 私钥 (仅测试环境使用!)  
    const tempPrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    privateKey = network.config.accounts[0] || tempPrivateKey;
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

    accountNonce = await provider.getTransactionCount(accountAddress);
    console.log(" ### ===> 发送交易账户nonce:", accountNonce);
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

    // === 步骤: 解析签名交易 === 
    // parseSignedTransaction(signedTx)

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

      const transaction = await provider.getTransaction(txHash);
      expect(transaction).to.not.be.null;
      expect(transaction.from.toLowerCase()).to.equal(accountAddress.toLowerCase());
      console.debug(" ### ===> transaction", transaction);
    } catch (error) {

      if (error instanceof AssertionError) {
        throw error
      }

      await handleError(rawTxHash, accountAddress, error, provider);
    }
  });

  // 部署合约测试
  it("调用合约接口", async function () {

    const nonce = await provider.getTransactionCount(accountAddress);
    console.log(" ### ===> nonce", nonce);

    const chainId = parseInt(await provider.send('eth_chainId', []), 16);
    console.log(" ### ===> chainId", chainId);

    const feeData = await provider.getFeeData();
    const from = accountAddress;
    const to = contractAddress; // 合约部署，to为null 
    const value = 0; // 不发送ETH  
    const gasLimit = 22000000n; // 为合约部署设置合适的gas限制  
    const data = emitEventData;

    // === 步骤: 创建签名交易 ===  
    const { signedTx, rawTxHash } = createTransaction(
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

      const transaction = await provider.getTransaction(txHash);
      expect(transaction).to.not.be.null;
      expect(transaction.from.toLowerCase()).to.equal(accountAddress.toLowerCase());
      // console.debug(" ### ===> transaction", transaction);
    } catch (error) {

      if (error instanceof AssertionError) {
        throw error
      }

      await handleError(rawTxHash, accountAddress, error, provider);
    }
  });


  it("异常nonce", async function () {

    const chainId = parseInt(await provider.send('eth_chainId', []), 16);
    const feeData = await provider.getFeeData();
    const from = accountAddress;
    const to = contractAddress; // 合约部署，to为null 
    const value = 0; // 不发送ETH  
    const gasLimit = 22000000n; // 为合约部署设置合适的gas限制  
    const data = emitEventData;

    {
      // Nonce 与前一次相同 
      const nonce = await provider.getTransactionCount(accountAddress) - 1;

      // === 步骤: 创建签名交易 ===  
      const { signedTx, rawTxHash } = createTransaction(
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
        expect(true).to.be.false;
        // console.log("交易已发送，哈希:", txHash);
        // expect(txHash).to.equal(rawTxHash);

        // // === 步骤: 等待交易确认 ===  
        // const receipt = await provider.waitForTransaction(txHash);

        // // 校验from字段
        // expect(receipt.from.toLowerCase()).to.equal(accountAddress.toLowerCase());

        // const transaction = await provider.getTransaction(txHash);
        // expect(transaction).to.not.be.null;
        // expect(transaction.from.toLowerCase()).to.equal(accountAddress.toLowerCase());
        // console.debug(" ### ===> transaction", transaction);
      } catch (error) {

        if (error instanceof AssertionError) {
          throw error
        }
        //  
        const hasSubstring =
          error.message.includes("NonceCheckFail") ||
          error.message.includes("Nonce") ||
          error.message.includes("nonce");

        expect(hasSubstring).to.be.true;

        // await handleError(rawTxHash, accountAddress, error, provider);
      }
    }


    {
      // Nonce 置零
      const nonce = 0;
      // === 步骤: 创建签名交易 ===  
      const { signedTx, rawTxHash } = createTransaction(
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
        expect(true).to.be.false;
        // console.log("交易已发送，哈希:", txHash);
        // expect(txHash).to.equal(rawTxHash);

        // // === 步骤: 等待交易确认 ===  
        // const receipt = await provider.waitForTransaction(txHash);

        // // 校验from字段
        // expect(receipt.from.toLowerCase()).to.equal(accountAddress.toLowerCase());

        // const transaction = await provider.getTransaction(txHash);
        // expect(transaction).to.not.be.null;
        // expect(transaction.from.toLowerCase()).to.equal(accountAddress.toLowerCase());
        // console.debug(" ### ===> transaction", transaction);
      } catch (error) {

        if (error instanceof AssertionError) {
          throw error
        }

        // console.log(" ### ===> error", error);

        const hasSubstring =
          error.message.includes("NonceCheckFail") ||
          error.message.includes("Nonce") ||
          error.message.includes("nonce");

        expect(hasSubstring).to.be.true;
        // await handleError(rawTxHash, accountAddress, error, provider);
      }
    }

    // Nonce 为字符串
    {
      const nonce = "HelloWorld，世界你好~！@#￥%……&*（）abcdefghijklmiopq63614101240054722004297811927860191653951076737992592011437881426126469238567698669271990135586095028951356841884186031262120223881211828646342895460926161383537";
      // === 步骤: 创建签名交易 ===  
      const { signedTx, rawTxHash } = createTransaction(
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
        expect(true).to.be.false;
        // console.log("交易已发送，哈希:", txHash);
        // expect(txHash).to.equal(rawTxHash);

        // // === 步骤: 等待交易确认 ===  
        // const receipt = await provider.waitForTransaction(txHash);

        // // 校验from字段
        // expect(receipt.from.toLowerCase()).to.equal(accountAddress.toLowerCase());

        // const transaction = await provider.getTransaction(txHash);
        // expect(transaction).to.not.be.null;
        // expect(transaction.from.toLowerCase()).to.equal(accountAddress.toLowerCase());
        // console.debug(" ### ===> transaction", transaction);
      } catch (error) {

        if (error instanceof AssertionError) {
          throw error
        }

        console.log(" ### ===> error", error);
        //  TODO: FB 异常 to do fix
        const hasSubstring =
          error.message.includes("NonceCheckFail") ||
          error.message.includes("Nonce") ||
          error.message.includes("nonce");

        // expect(hasSubstring).to.be.true;
        // await handleError(rawTxHash, accountAddress, error, provider);
      }
    }
  });

  it("异常to", async function () {
    // 合约地址不存在
    const to = "0xD7F6a7b883eB17dD2B0Cd4628528Cd8c2C7A5111";

    const chainId = parseInt(await provider.send('eth_chainId', []), 16);
    const nonce = await provider.getTransactionCount(accountAddress);
    const feeData = await provider.getFeeData();
    const value = 0; // 不发送ETH  
    const gasLimit = 22000000n; // 为合约部署设置合适的gas限制  
    const from = accountAddress;
    const data = emitEventData;

    // === 步骤: 创建交易 === 
    const { signedTx, rawTxHash } = createTransaction(
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

      // TODO: FB 异常 to do fix
      console.log("交易已执行，回执:", receipt);
      // expect(1).to.not.equal(receipt.status);

      // expect(false).to.be.true;
    } catch (error) {

      if (error instanceof AssertionError) {
        throw error
      }
      await handleError(rawTxHash, accountAddress, error, provider);
    }
  });

  it("异常value", async function () {

    const chainId = parseInt(await provider.send('eth_chainId', []), 16);
    console.log(" ### ===> chainId", chainId);
    const nonce = await provider.getTransactionCount(accountAddress);
    const feeData = await provider.getFeeData();
    const to = contractAddress // 合约部署，to为null 
    const value = "-1"; // 不发送ETH  
    const gasLimit = 22000000n; // 为合约部署设置合适的gas限制  
    const from = accountAddress;
    const data = emitEventData;

    // === 步骤: 创建交易 === 
    const { signedTx, rawTxHash } = createTransaction(
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
      console.log("交易已执行，回执:", receipt);

      expect(false).to.be.true;
    } catch (error) {

      if (error instanceof AssertionError) {
        throw error
      }
      await handleError(rawTxHash, accountAddress, error, provider);
    }
  });
}
);

// ======== 工具函数 ========  

/**
 * 处理交易失败的情况
 * 
 * @param {*} rawTxHash 
 * @param {*} accountAddress 
 * @param {*} error 
 * @param {*} provider 
 */
async function handleError(rawTxHash, accountAddress, error, provider) {
  /*
        错误的格式示例:
        error: {
          code: -32603,
          message: 'Error: Transaction reverted: non-payable function was called with value 1',
          data: {
            message: 'Error: Transaction reverted: non-payable function was called with value 1',
            txHash: '0x824b0bb911fd7dea90ebfad89a4836422dab51f4b3cb0fb72a1d0502f68b1bd9',
            data: '0x'
          }
        }
        */

  console.log(" ### ===> error", error);

  const txHash = error?.error?.data?.txHash;
  if (!txHash) {
    console.log(" ### ===> 交易失败, 没有找到txHash", error);
    // console.error(" ### ===> error", error);
    expect(false).to.be.true;
    return;
  }

  console.debug(" ### 交易失败, error", error);
  expect(txHash).to.equal(rawTxHash);

  const receipt = await provider.getTransactionReceipt(txHash);
  expect(receipt).to.not.be.null;
  expect(1).to.not.equal(receipt.status);
  expect(receipt.from.toLowerCase()).to.equal(accountAddress.toLowerCase());
  // console.debug(" ### ===> receipt", receipt);

  const transaction = await provider.getTransaction(txHash);
  expect(transaction).to.not.be.null;
  expect(transaction.from.toLowerCase()).to.equal(accountAddress.toLowerCase());
  // console.debug(" ### ===> transaction", transaction);
}

/**
 * 创建交易并签名交易
 * 
 * @param {*} chainId 
 * @param {*} nonce 
 * @param {*} feeData 
 * @param {*} gasLimit 
 * @param {*} from 
 * @param {*} to 
 * @param {*} value 
 * @param {*} data  
 * @param {*} wallet 
 * @returns 
 */
function createTransaction(chainId, nonce, feeData, gasLimit, from, to, value, data, wallet) {

  const gasPrice = feeData.gasPrice || ethers.parseUnits("30", "gwei");

  // Legacy交易的字段顺序: [nonce, gasPrice, gasLimit, to, value, data, v, r, s]  
  const fields = [
    nonce,
    gasPrice, // 使用gasPrice替代maxFeePerGas 
    gasLimit,
    to || "0x",
    value,
    data || "0x",
    chainId,    // v 值在未签名时是chainId  
    "0x",              // r 值在未签名时是0x  
    "0x"               // s 值在未签名时是0x  
  ];

  // 打印每个字段，用于调试  
  console.debug("Legacy Transaction Fields:", {
    nonce: fields[0],
    gasPrice: fields[1],
    gasLimit: fields[2],
    to: fields[3],
    value: fields[4],
    data: fields[5].substring(0, 20) + "...", // 截断数据显示  
    chainId: fields[6]
  });

  // RLP encode transaction fields  
  const rlpEncoded = RLP.encode(fields);

  // 计算需要签名的哈希  
  const txHash = keccak256(Buffer.from(rlpEncoded));

  // 签名哈希  
  const signature = wallet.signingKey.sign(txHash);
  //  从签名中提取r, s, v  
  const r = signature.r;
  const s = signature.s;
  /*
  // 计算v值 - Legacy交易的v值计算: recoveryId + chainId * 2 + 35  
  static getChainIdV(chainId: BigNumberish, v: 27 | 28): bigint {
    return (getBigInt(chainId) * BN_2) + BigInt(35 + v - 27);
  }
  */
  const v = BigInt(chainId) * 2n + BigInt(35 + signature.v - 27);

  // 构建包含签名的完整交易字段  
  const signedFields = [
    nonce,
    gasPrice,
    gasLimit,
    to || "0x",
    value,
    data || "0x",
    v,
    r,
    s
  ];

  // RLP编码签名后的交易  
  const signedRlpEncoded = RLP.encode(signedFields);

  const signedTx = "0x" + bytesToHex(signedRlpEncoded);

  // 交易哈希
  const rawTxHash = "0x" + bytesToHex(keccak256(Buffer.from(signedRlpEncoded)));

  console.debug("Legacy Transaction Sign Tx:", {
    signedTx: signedTx,
    txHash: rawTxHash
  });

  return {
    signedTx,
    rawTxHash: rawTxHash
  };
}

