const { run, network, config } = require("hardhat")
const { ethers, keccak256 } = require("ethers");
const { expect, AssertionError } = require("chai");
const secp256k1 = require("ethereum-cryptography/secp256k1");
const { bytesToHex, hexToBytes } = require("ethereum-cryptography/utils");
const RLP = require("@ethereumjs/rlp");
const {
    parseSignedTransaction
} = require('../../scripts/utils/transactionParser');

const {
    createEip2930Transaction
} = require('../../scripts/utils/transactionCreator');

// EIP-2930 交易结构
// 0x01 || rlp([chainId, nonce, gasPrice, gasLimit, to, value, data, accessList, signatureYParity, signatureR, signatureS])

describe("Send EIP-2930 Raw Transaction", function () {

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
        const { signedTx, rawTxHash } = createEip2930Transaction(
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
        parseSignedTransaction(rawTxHash, signedTx)

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

            await handleTxError(rawTxHash, accountAddress, error, provider);
        }
    });
});