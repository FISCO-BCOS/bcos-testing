const { run, network, config } = require("hardhat")
const { ethers } = require("ethers");
const { keccak256 } = require("ethereum-cryptography/keccak");
const secp256k1 = require("ethereum-cryptography/secp256k1");
const { bytesToHex, hexToBytes } = require("ethereum-cryptography/utils");
const RLP = require("@ethereumjs/rlp");

describe("Send EIP-1559 Raw Transaction", function () {

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
    console.log("编译Lock合约...");
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

    // 创建合约ABI接口
    // const contractInterface = new ethers.Interface(contractArtifact.abi);

    // console.log(" ### ===> contractInterface", contractInterface);

    // 编码构造函数参数（"Hello, Blockchain!"）
    // const constructorArgs = contractInterface.encodeDeploy([unlockTime]);

    // 合并字节码和构造函数参数
    const contractBytecode = bytecode //+ constructorArgs.slice(2); // 移除参数的0x前缀

    const chainId = (await provider.getNetwork()).chainId;
    const nonce = await provider.getTransactionCount(wallet.address);
    const feeData = await provider.getFeeData();
    // console.log(" ### ===> feeData", feeData);

    let gasLimit = 220000n; // 简单转账


    const { signedTx, txHash } = createAndSignEIP1559Transaction(
      chainId,
      nonce,
      feeData,
      gasLimit,
      wallet.address,
      null,  // 合约部署，to为null
      "0",   // 不发送ETH
      contractBytecode,  // 合约字节码
      privateKey
    );

    /*

    // 1. 创建交易对象
    const txData = createEIP1559Transaction(
      chainId,
      nonce,
      feeData,
      gasLimit,
      wallet.address,
      null,  // 合约部署，to为null
      "0",   // 不发送ETH
      contractBytecode  // 合约字节码
    );

    // 2. 签名交易
    const { signedTx, txHash } = signEIP1559Transaction(txData, privateKey);
    */
    // 3. 发送交易
    const sentTxHash = await provider.send("eth_sendRawTransaction", [signedTx]);
    console.log(" ### ===> txHash", txHash);
    console.log("交易已发送，哈希:", sentTxHash);

    // console.log(" ### ===> signedTx", signedTx);
    // 4. 等待交易确认
    const receipt = await provider.waitForTransaction(sentTxHash);
    console.log(" ### ===> receipt", receipt);
    console.log("合约已部署，地址:", receipt.contractAddress);
  });

  /*
  it("应该手动调用Lock合约的setMessage函数", async function () {

    
    // 创建合约实例 (用于验证，不用于交易发送)
    const Lock = new ethers.Contract(
      contractAddress,
      contractArtifact.abi,
      wallet
    );
    
    // === 步骤1: 准备合约调用交易 ===
    console.log("=== 步骤1: 准备合约调用交易 ===");
    
    // 创建合约ABI接口
    const contractInterface = new ethers.Interface(contractArtifact.abi);
    
    // 编码函数调用
    const newMessage = "Hello from manual transaction!";
    const callData = contractInterface.encodeFunctionData("setMessage", [newMessage]);
    
    // 创建调用交易对象
    const callTxData = await createEIP1559Transaction(
      provider, 
      privateKey, 
      contractAddress, 
      "0", // 不发送ETH
      callData
    );
    
    console.log("合约调用交易已创建:");
    console.log("- 调用数据:", callData);
    console.log("- Gas限制:", callTxData.gasLimit.toString());
    
    // === 步骤2: RLP编码调用交易 ===
    console.log("=== 步骤2: RLP编码调用交易 ===");
    const { rlpEncoded: callRlpEncoded, unsignedTx: callUnsignedTx, txType: callTxType } = 
      encodeEIP1559Transaction(callTxData);
    console.log("调用交易RLP编码完成");
    
    // === 步骤3: 签名调用交易 ===
    console.log("=== 步骤3: 签名调用交易 ===");
    const { v: callV, r: callR, s: callS } = 
      signEIP1559Transaction(callRlpEncoded, callTxType, privateKey, callTxData.chainId);
    console.log("调用交易已签名");
    
    // === 步骤4: 组装签名后的调用交易 ===
    console.log("=== 步骤4: 组装签名后的调用交易 ===");
    const signedCallTx = 
      assembleSignedTransaction(callUnsignedTx, callV, callR, callS, callTxType, callTxData.type);
    console.log("签名后的调用交易:", signedCallTx.substring(0, 66) + "...");
    
    // === 步骤5: 发送调用交易 ===
    console.log("=== 步骤5: 发送调用交易 ===");
    const callTxHash = await sendTransaction(provider, signedCallTx);
    console.log("调用交易已发送，等待确认...");
    console.log("交易哈希:", callTxHash);
    
    // === 步骤6: 等待调用确认 ===
    console.log("=== 步骤6: 等待调用确认 ===");
    const callReceipt = await waitForTransaction(provider, callTxHash);
    
    console.log("合约调用成功!");
    console.log("- 区块号:", callReceipt.blockNumber);
    console.log("- Gas使用量:", callReceipt.gasUsed.toString());
    
    // 验证消息已更新
    const updatedMessage = await Lock.getMessage();
    console.log("- 更新后的消息:", updatedMessage);
    expect(updatedMessage).to.equal(newMessage);
  });
  
  it("应该手动调用Lock合约的getMessage函数", async function () {
    // 创建合约ABI接口
    const contractInterface = new ethers.Interface(contractArtifact.abi);
    
    // === 步骤1: 准备只读调用 ===
    console.log("=== 步骤1: 准备只读调用 ===");
    
    // 编码getMessage函数调用
    const callData = contractInterface.encodeFunctionData("getMessage", []);
    
    // === 步骤2: 执行只读调用 ===
    console.log("=== 步骤2: 执行只读调用 ===");
    
    // 注意: 这是一个view函数，不需要发送交易，只需要呼叫
    const result = await provider.call({
      to: contractAddress,
      data: callData
    });
    
    // === 步骤3: 解码结果 ===
    console.log("=== 步骤3: 解码结果 ===");
    const decodedResult = contractInterface.decodeFunctionResult("getMessage", result);
    
    console.log("getMessage调用结果:", decodedResult[0]);
    expect(decodedResult[0]).to.equal("Hello from manual transaction!");
  });
  */
});

// ======== 工具函数 ========

/**
 * 创建签名交易对象
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
function createAndSignEIP1559Transaction(chainId, nonce, feeData, gasLimit, from, to, value, data, privateKey) {
  // 创建交易对象
  const eip1559Tx = createEIP1559Transaction(
    chainId,
    nonce,
    feeData,
    gasLimit,
    from,
    to,  // 合约部署，to为null
    value,   // 不发送ETH
    data  // 合约字节码
  );

  // 签名交易
  const { signedTx, txHash } = signEIP1559Transaction(eip1559Tx, privateKey);

  return {
    signedTx,
    txHash
  };
}

// 创建交易对象
function createEIP1559Transaction(chainId, nonce, feeData, gasLimit, from, to, value, data) {

  // 预估Gas（对于合约部署和调用特别重要）
  // let gasLimit = 21000n; // 简单转账

  /*
  let gasLimit;
    if (!to) {
      // 合约部署需要大量gas
      gasLimit = 3000000n;
    } else if (data && data !== '0x' && data.length > 10) {
      // 合约交互 (有意义的data字段)
      gasLimit = 500000n;
    } else {
      // 简单转账
      gasLimit = 21000n;
    }
    */

  return {
    // from: from,
    to: to, // 对于部署，这将是null
    value: ethers.parseEther(value),
    gasLimit: gasLimit,
    nonce: nonce,
    chainId: chainId,
    maxFeePerGas: feeData.maxFeePerGas || ethers.parseUnits("30", "gwei"),
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || ethers.parseUnits("1", "gwei"),
    type: 2, // EIP-1559
    data: data || "0x" // 合约字节码或函数调用数据
  };
}


/**
* 签名EIP-1559交易函数
*/
function signEIP1559Transaction(txData, privateKey) {
  // 确保是EIP-1559交易
  if (txData.type !== 2) {
    throw new Error("只能签名EIP-1559交易（type: 2）");
  }

  // 1. 编码交易
  const { rlpEncoded, fields } = encodeEIP1559Transaction(txData);

  // 2. 添加交易类型前缀并计算哈希
  const txType = Buffer.from([2]); // EIP-1559类型前缀
  const dataToHash = Buffer.concat([txType, Buffer.from(rlpEncoded)]);
  const txHash = keccak256(dataToHash);

  // 3. 准备私钥
  const privKeyBytes = typeof privateKey === 'string' && privateKey.startsWith('0x')
    ? hexToBytes(privateKey.substring(2))
    : hexToBytes(privateKey);

  // 4. 使用私钥签名交易哈希
  const signature = secp256k1.ecdsaSign(txHash, privKeyBytes);

  // 5. 从签名中提取r, s, v
  const r = "0x" + bytesToHex(signature.signature.slice(0, 32));
  const s = "0x" + bytesToHex(signature.signature.slice(32, 64));
  const v = BigInt(signature.recid); // 只是recovery id (0或1)

  // 6. 构建包含签名的完整交易字段（确保v没有前导零）
  const signedFields = [...fields, toRlpHex(v), r, s];

  // 7. RLP编码签名后的交易
  const signedRlpEncoded = RLP.encode(signedFields);

  // 8. 添加EIP-1559交易类型前缀(0x02)
  const signedTx = "0x02" + bytesToHex(signedRlpEncoded);

  return {
    signedTx,
    r,
    s,
    v,
    txHash: "0x" + bytesToHex(txHash),
    encodedFields: signedFields
  };
}

/**
 * RLP编码EIP-1559交易函数
 */
function encodeEIP1559Transaction(txData) {
  // 验证是否为EIP-1559交易
  if (txData.type !== 2) {
    throw new Error("Not EIP-1559 transaction type, type: " + txData.type);
  }

  // 确保所有数值都正确格式化，没有前导零
  const fields = [
    toRlpHex(txData.chainId),
    toRlpHex(txData.nonce),
    toRlpHex(txData.maxPriorityFeePerGas),
    toRlpHex(txData.maxFeePerGas),
    toRlpHex(txData.gasLimit),
    txData.to || "0x",
    toRlpHex(txData.value),
    txData.data || "0x",
    txData.accessList || []
  ];

  // 打印每个字段，用于调试
  console.log("EIP-1559 Transaction Fields:", {
    chainId: fields[0],
    nonce: fields[1],
    maxPriorityFeePerGas: fields[2],
    maxFeePerGas: fields[3],
    gasLimit: fields[4],
    to: fields[5],
    value: fields[6],
    data: fields[7].substring(0, 20) + "..." // 截断数据显示
  });

  // RLP encode transaction fields
  const rlpEncoded = RLP.encode(fields);

  return {
    rlpEncoded,
    fields,
    txType: "0x02",
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
