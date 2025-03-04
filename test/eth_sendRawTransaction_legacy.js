const { run, network, config } = require("hardhat")
const { ethers } = require("ethers");
const { keccak256 } = require("ethereum-cryptography/keccak");
const secp256k1 = require("ethereum-cryptography/secp256k1");
const { bytesToHex, hexToBytes } = require("ethereum-cryptography/utils");
const RLP = require("@ethereumjs/rlp");
// app.js  
const {
  parseSignedTransaction,
  getTransactionSummary,
  getTransactionSender
} = require('../scripts/utils/transactionParser');

describe("Send Legacy Raw Transaction", function () {

  // 存储部署后的合约地址  
  let contractAddress;
  // 存储编译后的合约信息  
  let contractArtifact;
  // rpc provider  
  let provider;
  // 私钥  
  let privateKey;

  let wallet;

  before(async function () {

    console.log(" ### ===> network", network);
    // 编译合约  
    console.log("编译合约...");
    await run("compile");

    const contractName = "Empty";

    // 加载编译后的合约构件  
    contractArtifact = require(`${config.paths.artifacts}/contracts/${contractName}.sol/${contractName}.json`);
    console.log("合约编译成功");

    const name = network.name;
    const chainId = network.config.chainId || 20200;
    const url = network.config.url || "http://127.0.0.1:8545";

    console.log(" ### ===> chainId", chainId);
    console.log(" ### ===> url", url);
    console.log(" ### ===> name", name);

    // === rpc provider ===  
    provider = new ethers.JsonRpcProvider(url, { chainId: chainId, name: name }, { staticNetwork: true });

    // 私钥 (仅测试环境使用!)  
    tempPrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
    privateKey = network.config.accounts[0] || tempPrivateKey;

    wallet = new ethers.Wallet(privateKey, provider);
    console.log(" ### ===> 部署账户:", wallet.address);
  });

  it("部署合约", async function () {

    // === 步骤1: 准备合约部署交易 ===  
    console.log("=== 步骤1: 准备合约部署交易 ===");

    // 获取合约字节码  
    const bytecode = contractArtifact.bytecode;

    const chainId = (await provider.getNetwork()).chainId;
    const nonce = await provider.getTransactionCount(wallet.address);
    const feeData = await provider.getFeeData();

    let gasLimit = 220000n; // 为合约部署设置合适的gas限制  

    const { signedTx, txHash } = createAndSignLegacyTransaction(
      chainId,
      nonce,
      feeData,
      gasLimit,
      wallet.address,
      null,  // 合约部署，to为null  
      "0",   // 不发送ETH  
      bytecode,  // 合约字节码  
      privateKey
    );

    // 发送交易  
    const sentTxHash = await provider.send("eth_sendRawTransaction", [signedTx]);
    console.log(" ### ===> txHash", txHash);
    console.log("交易已发送，哈希:", sentTxHash);

    console.log(" ### ===> signedTx", signedTx);
    parseSignedTransaction(signedTx)

    // 等待交易确认  
    const receipt = await provider.waitForTransaction(sentTxHash);
    console.log(" ### ===> receipt", receipt);
    console.log("合约已部署，地址:", receipt.contractAddress);
  });
});

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
  // 创建交易对象  
  const legacyTx = createLegacyTransaction(
    chainId,
    nonce,
    feeData,
    gasLimit,
    from,
    to,
    value,
    data
  );

  // 签名交易  
  const { signedTx, txHash } = signLegacyTransaction(legacyTx, privateKey);

  return {
    signedTx,
    txHash
  };
}

/**  
 * 创建Legacy交易对象  
 */
function createLegacyTransaction(chainId, nonce, feeData, gasLimit, from, to, value, data) {
  return {
    to: to, // 对于部署，这将是null  
    value: ethers.parseEther(value),
    gasLimit: gasLimit,
    nonce: nonce,
    chainId: chainId,
    gasPrice: feeData.gasPrice || ethers.parseUnits("30", "gwei"), // 使用gasPrice替代maxFeePerGas  
    data: data || "0x" // 合约字节码或函数调用数据  
  };
}

/**  
 * 签名Legacy交易函数  
 */
function signLegacyTransaction(txData, privateKey) {
  // 1. 编码交易  
  const { rlpEncoded, fields } = encodeLegacyTransaction(txData);

  // console.log(" ### ===> rlpEncoded", rlpEncoded);

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
    toRlpHex(txData.nonce),
    toRlpHex(txData.gasPrice),
    toRlpHex(txData.gasLimit),
    txData.to || "0x",
    toRlpHex(txData.value),
    txData.data || "0x",
    toRlpHex(v),
    r,
    s
  ];

  // 7. RLP编码签名后的交易  
  const signedRlpEncoded = RLP.encode(signedFields);

  // 8. Legacy交易不需要类型前缀  
  const signedTx = "0x" + bytesToHex(signedRlpEncoded);

  const txHash1 = keccak256(Buffer.from
    (signedRlpEncoded));

  return {
    signedTx,
    r,
    s,
    v,
    txHash: "0x" + bytesToHex(txHash1),
    encodedFields: signedFields
  };
}

/**  
 * RLP编码Legacy交易函数  
 */
function encodeLegacyTransaction(txData) {
  // Legacy交易的字段顺序: [nonce, gasPrice, gasLimit, to, value, data, v, r, s]  
  const fields = [
    toRlpHex(txData.nonce),
    toRlpHex(txData.gasPrice),
    toRlpHex(txData.gasLimit),
    txData.to || "0x",
    toRlpHex(txData.value),
    txData.data || "0x",
    toRlpHex(txData.chainId),    // v 值在未签名时是chainId  
    "0x",                        // r 值在未签名时是0x  
    "0x"                         // s 值在未签名时是0x  
  ];

  // 打印每个字段，用于调试  
  console.log("Legacy Transaction Fields:", {
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
  };
}

/**  
* 辅助函数：正确格式化十六进制值，去除不必要的前导零  
* @param {any} value - 要转换的值  
* @returns {string} RLP格式的十六进制值  
*/
function toRlpHex(value) {
  // 处理空值或零值  
  if (value === undefined || value === null) {
    return '0x';
  }

  if (value === '0x' || value === 0 || value === '0' || value === '0x0' || value === '0x00') {
    return '0x';
  }

  // 转换为BigInt处理数值(能处理数字和十六进制字符串)  
  let bigIntValue;
  try {
    if (typeof value === 'string' && value.startsWith('0x')) {
      bigIntValue = BigInt(value);
    } else if (typeof value === 'number' || typeof value === 'bigint') {
      bigIntValue = BigInt(value);
    } else {
      // 非数值类型的字符串，直接添加0x前缀返回  
      return value.startsWith('0x') ? value : `0x${value}`;
    }

    // 如果值为0，返回0x  
    if (bigIntValue === 0n) {
      return '0x';
    }

    // 转换为十六进制并去除前导零  
    let hexValue = bigIntValue.toString(16);

    // 确保没有前导零  
    hexValue = hexValue.replace(/^0+/, '');

    return `0x${hexValue}`;
  } catch (e) {
    // 处理错误情况，返回原始值加前缀  
    console.warn(`无法将 ${value} 转换为BigInt: ${e.message}`);
    if (typeof value === 'string') {
      return value.startsWith('0x') ? value : `0x${value}`;
    }
    return `0x${value.toString()}`;
  }
}
