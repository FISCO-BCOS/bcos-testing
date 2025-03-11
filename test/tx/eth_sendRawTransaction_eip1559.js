const { run, network, config } = require("hardhat")
const { ethers, keccak256 } = require("ethers");
const { expect, AssertionError } = require("chai");
const { bytesToHex, hexToBytes } = require("ethereum-cryptography/utils");
const RLP = require("@ethereumjs/rlp");
const {
  parseSignedTransaction
} = require('../../scripts/utils/transactionParser');

const {
  createEip1559Transaction
} = require('../../scripts/utils/transactionCreator');

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

    // 初始化参数
    const chainId = network.config.chainId;
    const url = network.config.url;
    const name = network.name;
    // 打印网络信息
    // console.debug(" ### ===> network", network);

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
    const { signedTx, rawTxHash } = createEip1559Transaction(
      chainId,
      nonce,
      feeData,
      gasLimit,
      from,
      to,
      value,
      bytecode,
      [],
      wallet
    );

    console.log(" ############# ===> rawTxHash", rawTxHash);

    // === 步骤: 解析签名交易 === 
    // parseSignedTransaction(rawTxHash, signedTx)

    try {
      // === 步骤: 发送交易 ===  
      const txHash = await provider.send("eth_sendRawTransaction", [signedTx]);
      console.log("交易已发送，哈希:", txHash);
      expect(txHash).to.equal(rawTxHash);

      // === 步骤: 等待交易确认 ===  
      const receipt = await provider.waitForTransaction(txHash);
      console.log("交易已经执行，回执:", receipt);

      expect(1).to.equal(receipt.status);
      contractAddress = receipt.contractAddress;

      // 校验from字段
      expect(receipt.from.toLowerCase()).to.equal(accountAddress.toLowerCase());

      const transaction = await provider.getTransaction(txHash);
      expect(transaction).to.not.be.null;
      expect(transaction.from.toLowerCase()).to.equal(accountAddress.toLowerCase());
      console.debug(" ### ===> transaction", transaction);
    } catch (error) {

      console.log(" ### ===> error", error);

      if (error instanceof AssertionError) {
        throw error
      }

      await handleError(rawTxHash, accountAddress, error, provider);
    }
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