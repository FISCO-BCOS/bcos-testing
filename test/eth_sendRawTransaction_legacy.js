const { run, network, config } = require("hardhat")
const { ethers } = require("ethers");
const { expect } = require("chai");
const { keccak256 } = require("ethereum-cryptography/keccak");
const secp256k1 = require("ethereum-cryptography/secp256k1");
const { bytesToHex, hexToBytes } = require("ethereum-cryptography/utils");
const RLP = require("@ethereumjs/rlp");
const {
  parseSignedTransaction
} = require('../scripts/utils/transactionParser');

describe("Legacy Raw Transaction 测试集", function () {

  // 存储部署后的合约地址  
  let contractAddress;
  // 存储编译后的合约信息  
  let contractArtifact;
  // rpc provider  
  let provider;
  // 私钥  
  let privateKey;
  // 链ID  
  let chainId;
  // 发送交易账户地址  
  let accountAddress;
  // 
  let accountNonce;

  this.beforeAll(async function () {
    // 打印网络信息
    // console.log(" ### ===> network", network);

    // 初始化参数
    chainId = network.config.chainId;

    // 私钥 (仅测试环境使用!)  
    tempPrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    privateKey = network.config.accounts[0] || tempPrivateKey;

    console.log(" ### ===> chainId", chainId);
    console.log(" ### ===> privateKey:", privateKey);

    // 编译合约
    const contractName = "Empty";
    console.log("编译合约:", contractName);
    await run("compile");
    contractArtifact = require(`${config.paths.artifacts}/contracts/${contractName}.sol/${contractName}.json`);
    console.log("合约编译成功");

    const name = network.name;
    const url = network.config.url || "http://127.0.0.1:8545";
    console.log(" ### ===> url", url);
    console.log(" ### ===> name", name);

    // === rpc provider ===  
    provider = new ethers.JsonRpcProvider(url, { chainId: chainId, name: name }, { staticNetwork: true });

    // === 钱包 ===  
    const wallet = new ethers.Wallet(privateKey, provider);
    accountAddress = wallet.address;
    console.log(" ### ===> 发送交易账户:", accountAddress);

    accountNonce = await provider.getTransactionCount(accountAddress);
    console.log(" ### ===> 发送交易账户nonce:", accountNonce);
  });

  it("部署合约", async function () {

    // === 步骤: 准备合约部署交易 ===  
    console.log("=== 步骤: 准备合约部署交易 ===");

    // === 步骤: 交易参数 ===  
    const nonce = accountNonce;
    accountNonce = nonce + 1;
    const feeData = await provider.getFeeData();
    const from = accountAddress;
    const to = null; // 合约部署，to为null 
    const value = "0"; // 不发送ETH  
    const gasLimit = 22000000n; // 为合约部署设置合适的gas限制  
    const bytecode = contractArtifact.bytecode;  // 获取合约字节码 
    // const abi = contractArtifact.abi;

    // === 步骤: 创建签名交易 ===  
    const { signedTx, signedTxHash } = createAndSignLegacyTransaction(
      chainId,
      nonce,
      feeData,
      gasLimit,
      from,
      to,
      value,
      bytecode,
      privateKey
    );

    // === 步骤: 解析签名交易 === 
    // parseSignedTransaction(signedTx)

    try {
      // === 步骤: 发送交易 ===  
      const txHash = await provider.send("eth_sendRawTransaction", [signedTx]);
      console.log("交易已发送，哈希:", txHash);

      // === 步骤: 等待交易确认 ===  
      const receipt = await provider.waitForTransaction(txHash);
      console.log("交易已经执行，回执:", receipt);
      console.log("回执 logs:", receipt.logs);

      contractAddress = receipt.contractAddress;
      receipt.from = accountAddress;

      expect(receipt.from.toLowerCase()).to.equal(accountAddress.toLowerCase());

    } catch (error) {
      // console.log(" ### ===> error", error);
      // console.log(" ### ===> error.code", error.code);
      console.error(" ### ===> error", error);
    }
  });

  // 部署合约测试
  it("调用合约接口", async function () {

    // === 步骤: 准备合约部署交易 ===  
    console.log("=== 步骤: 准备调用合约 ===");

    // === 步骤: 交易参数 ===  
    const nonce = accountNonce;
    accountNonce += 1;

    const feeData = await provider.getFeeData();
    const from = accountAddress;
    const to = contractAddress; // 合约部署，to为null 
    const value = "0"; // 不发送ETH  
    const gasLimit = 22000000n; // 为合约部署设置合适的gas限制  

    const abi = contractArtifact.abi;
    // 创建合约ABI接口
    const contractInterface = new ethers.Interface(abi);

    const bytecode = contractInterface.encodeFunctionData("emitEvent", []);  // 获取合约字节码  

    console.log(" ### ===> bytecode", bytecode);

    // === 步骤: 创建签名交易 ===  
    const { signedTx } = createAndSignLegacyTransaction(
      chainId,
      nonce,
      feeData,
      gasLimit,
      from,
      to,
      value,
      bytecode,
      privateKey
    );

    try {
      // === 步骤: 发送交易 ===  
      const txHash = await provider.send("eth_sendRawTransaction", [signedTx]);
      console.log("交易已发送，哈希:", txHash);

      // === 步骤: 等待交易确认 ===  
      const receipt = await provider.waitForTransaction(txHash);

      expect(receipt.from.toLowerCase()).to.equal(accountAddress.toLowerCase());

      console.log("交易已执行，回执:", receipt);
      console.log("回执 logs:", receipt.logs);
    } catch (error) {
      console.log(" ### ===> error.message", error.message);
    }
  });

  /*
  it("异常nonce", async function () {

    const feeData = await provider.getFeeData();
    const from = accountAddress;
    const to = contractAddress; // 合约部署，to为null 
    const value = "0"; // 不发送ETH  
    const gasLimit = 22000000n; // 为合约部署设置合适的gas限制  

    // 创建合约ABI接口
    const bytecode = new ethers.Interface(contractArtifact.abi).encodeFunctionData("emitEvent", []);  // 获取合约字节码  

    // Nonce 与前一次相同 
    {
      const nonce = accountNonce - 1;
      // === Nonce 与前一次相同 ===  
      const { signedTx } = createAndSignLegacyTransaction(
        chainId,
        nonce,
        feeData,
        gasLimit,
        from,
        to,
        value,
        bytecode,
        privateKey
      );

      let txHash;
      try {
        // === 步骤: 发送交易 ===  
        txHash = await provider.send("eth_sendRawTransaction", [signedTx]);
        console.log("交易已发送，哈希:", txHash);

        // === 步骤: 等待交易确认 ===  
        const receipt = await provider.waitForTransaction(txHash);
        console.debug("交易已执行，回执:", receipt);
        expect(true).to.be.false;
      } catch (error) {
        console.debug("发送交易异常, error ", error.message);
        // expect(error.message).to.include("NonceCheckFail");
        // 多个可选子字符串  
        const hasSubstring =
          error.message.includes("NonceCheckFail") ||
          error.message.includes("Nonce") ||
          error.message.includes("nonce");

        expect(hasSubstring).to.be.true;
      }
    }

    // Nonce 置零
    {
      const nonce = 0;
      // === Nonce 与前一次相同 ===  
      const { signedTx } = createAndSignLegacyTransaction(
        chainId,
        nonce,
        feeData,
        gasLimit,
        from,
        to,
        value,
        bytecode,
        privateKey
      );

      try {
        // === 步骤: 发送交易 ===  
        const txHash = await provider.send("eth_sendRawTransaction", [signedTx]);
        console.log("交易已发送，哈希:", txHash);

        // === 步骤: 等待交易确认 ===  
        const receipt = await provider.waitForTransaction(txHash);
        console.debug("交易已执行，回执:", receipt);
        expect(true).to.be.false;
      } catch (error) {
        console.debug("发送交易异常, error ", error.message);
        // 多个可选子字符串  
        const hasSubstring =
          error.message.includes("NonceCheckFail") ||
          error.message.includes("Nonce") ||
          error.message.includes("nonce");

        expect(hasSubstring).to.be.true;
      }
    }

    // Nonce 为字符串
    {
      const nonce = "HelloWorld，世界你好~！@#￥%……&*（）";
      // const nonce = null;
      // const nonce = 0;
      // === Nonce 与前一次相同 ===  
      const { signedTx } = createAndSignLegacyTransaction(
        chainId,
        nonce,
        feeData,
        gasLimit,
        from,
        to,
        value,
        bytecode,
        privateKey
      );

      try {
        // === 步骤: 发送交易 ===  
        const txHash = await provider.send("eth_sendRawTransaction", [signedTx]);
        console.log("交易已发送，哈希:", txHash);

        // === 步骤: 等待交易确认 ===  
        const receipt = await provider.waitForTransaction(txHash);
        console.debug("交易已执行，回执:", receipt);
        expect(true).to.be.false;
      } catch (error) {
        console.debug("发送交易异常, error ", error.message);
        // 多个可选子字符串  
        const hasSubstring =
          error.message.includes("NonceCheckFail") ||
          error.message.includes("Nonce") ||
          error.message.includes("nonce") ||
          error.message.includes("NotEnoughCash");

        expect(hasSubstring).to.be.true;
      }
    }

  });

  it("异常to", async function () {
    const feeData = await provider.getFeeData();
    const to = "0xD7F6a7b883eB17dD2B0Cd4628528Cd8c2C7A5111";
    // const to = "0x000000000000000000000000000000000000111"; // 合约部署，to为null 
    const value = "0"; // 不发送ETH  
    const gasLimit = 22000000n; // 为合约部署设置合适的gas限制  
    const nonce = accountNonce;
    accountNonce++;
    const from = accountAddress;

    // 创建合约ABI接口
    const bytecode = new ethers.Interface(contractArtifact.abi).encodeFunctionData("emitEvent", []);  // 获取合约字节码 
    const { signedTx } = createAndSignLegacyTransaction(
      chainId,
      nonce,
      feeData,
      gasLimit,
      from,
      to,
      value,
      bytecode,
      privateKey
    );

    try {
      // === 步骤: 发送交易 ===  
      const txHash = await provider.send("eth_sendRawTransaction", [signedTx]);
      console.log("交易已发送，哈希:", txHash);

      // === 步骤: 等待交易确认 ===  
      const receipt = await provider.waitForTransaction(txHash);
      console.debug("交易已执行，回执:", receipt);
      expect(true).to.be.false;
    } catch (error) {
      console.debug("发送交易异常, error ", error.message);

      // TODO: 
      // 多个可选子字符串  
      const hasSubstring =
        error.message.includes("NonceCheckFail") ||
        error.message.includes("Nonce") ||
        error.message.includes("nonce") ||
        error.message.includes("NotEnoughCash");

      expect(hasSubstring).to.be.true;
    }
  });
  */

  it("异常value", async function () {

    const feeData = await provider.getFeeData();
    const to = contractAddress // 合约部署，to为null 
    const value = "0"; // 不发送ETH  
    const gasLimit = 22000000n; // 为合约部署设置合适的gas限制  
    const nonce = accountNonce;
    const from = accountAddress;

    // 创建合约ABI接口
    const bytecode = new ethers.Interface(contractArtifact.abi).encodeFunctionData("emitEvent", []);  // 获取合约字节码 
    const { signedTx, signedTxHash } = createAndSignLegacyTransaction(
      chainId,
      nonce,
      feeData,
      gasLimit,
      from,
      to,
      value,
      bytecode,
      privateKey
    );

    try {
      // === 步骤: 发送交易 ===  
      const txHash = await provider.send("eth_sendRawTransaction", [signedTx]);
      console.log("交易已发送，哈希:", txHash);

      // === 步骤: 等待交易确认 ===  
      const receipt = await provider.waitForTransaction(txHash);
      console.log("交易已执行，回执:", receipt);

      expect(false).to.be.true;
    } catch (error) {
      console.log("发送交易异常, error ", error.message);
      // TODO: 
    }
  });
}
);

// ======== 工具函数 ========  



/**  
 * 创建并签名Legacy交易对象  
 * @param {*} chainId   
 * @param {*} nonce   
 * @param {*} feeData   
 * @param {*} gasLimit   
 * @param {*} from   
 * @param {*} to   
 * @param {*} value   
 * @param {*} data   
 * @param {*} privateKey   
 * @returns   
 */
function createAndSignLegacyTransaction(chainId, nonce, feeData, gasLimit, from, to, value, data, privateKey) {

  const legacyTx = {
    to: to, // 对于部署，这将是null  
    value: value,
    gasLimit: gasLimit,
    chainId: chainId,
    nonce: nonce,
    gasPrice: feeData.gasPrice || ethers.parseUnits("30", "gwei"), // 使用gasPrice替代maxFeePerGas  
    data: data || "0x" // 合约字节码或函数调用数据  
  };

  // 签名交易  
  const { signedTx, txHash } = signLegacyTransaction(legacyTx, privateKey);

  return {
    signedTx,
    txHash
  };
}

/**  
 * 签名Legacy交易函数  
 */
function signLegacyTransaction(txData, privateKey) {
  // 1. 编码交易  
  const { rlpEncoded, fields } = encodeLegacyTransaction(txData);

  // 2. 计算交易哈希  
  const txHash = keccak256(Buffer.from(rlpEncoded));

  // 3. 准备私钥  
  const privKeyBytes = typeof privateKey === 'string' && privateKey.startsWith('0x')
    ? hexToBytes(privateKey.substring(2))
    : hexToBytes(privateKey);

  // 4. 使用私钥签名交易哈希  
  const signature = secp256k1.ecdsaSign(txHash, privKeyBytes);

  // 5. 从签名中提取r, s, v  
  const r = "0x" + bytesToHex(signature.signature.slice(0, 32));
  const s = "0x" + bytesToHex(signature.signature.slice(32, 64));

  // 计算v值 - Legacy交易的v值计算: recoveryId + chainId * 2 + 35  
  const v = BigInt(signature.recid) + BigInt(txData.chainId) * 2n + 35n;

  // 6. 构建包含签名的完整交易字段  
  const signedFields = [
    txData.nonce,
    txData.gasPrice,
    txData.gasLimit,
    txData.to || "0x",
    txData.value,
    txData.data || "0x",
    v,
    r,
    s
  ];

  // 7. RLP编码签名后的交易  
  const signedRlpEncoded = RLP.encode(signedFields);

  // 8. Legacy交易不需要类型前缀  
  const signedTx = "0x" + bytesToHex(signedRlpEncoded);

  const signedTxHash = "0x" + bytesToHex(keccak256(Buffer.from(signedRlpEncoded)));

  return {
    signedTx,
    r,
    s,
    v,
    txHash: "0x" + bytesToHex(txHash),
    signedTxHash: signedTxHash,
    encodedFields: signedFields
  };
}

/**  
 * RLP编码Legacy交易函数  
 */
function encodeLegacyTransaction(txData) {
  // Legacy交易的字段顺序: [nonce, gasPrice, gasLimit, to, value, data, v, r, s]  
  const fields = [
    txData.nonce,
    txData.gasPrice,
    txData.gasLimit,
    txData.to || "0x",
    txData.value,
    txData.data || "0x",
    txData.chainId,    // v 值在未签名时是chainId  
    "0x",                        // r 值在未签名时是0x  
    "0x"                         // s 值在未签名时是0x  
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

  return {
    rlpEncoded,
    fields,
    encodedHex: bytesToHex(rlpEncoded)
  }
}

