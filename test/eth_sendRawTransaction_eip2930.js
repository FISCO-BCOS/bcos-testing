const { run, network, config } = require("hardhat")
const { ethers } = require("ethers");
const { keccak256, signature } = require("ethereum-cryptography/keccak");
const secp256k1 = require("ethereum-cryptography/secp256k1");
const { bytesToHex, hexToBytes } = require("ethereum-cryptography/utils");
const RLP = require("@ethereumjs/rlp");
const BN = require('bn.js');

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

        // console.log(" ### ===> network", network);
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

        let gasLimit = 22000000n; // 为合约部署设置合适的gas限制  

        const { signedTx, txHash } = createAndSignEIP2930Transaction(
            chainId,
            nonce,
            feeData,
            gasLimit,
            wallet.address,
            null,  // 合约部署，to为null  
            "0",   // 不发送ETH  
            bytecode,  // 合约字节码  
            [],    // 空的accessList  
            privateKey
        );

        // 发送交易  
        const sentTxHash = await provider.send("eth_sendRawTransaction", [signedTx]);

        console.log(" 签名的交易 ### ===> signedTx", signedTx);
        console.log("交易已发送，哈希:", sentTxHash);

        // 等待交易确认  
        const receipt = await provider.waitForTransaction(sentTxHash);
        console.log(" ### ===> receipt", receipt);
        console.log("合约已部署，地址:", receipt.contractAddress);
    });
});

// ======== 工具函数 ========  

/**  
 * 创建并签名EIP-2930交易对象  
 */
function createAndSignEIP2930Transaction(chainId, nonce, feeData, gasLimit, from, to, value, data, accessList, privateKey) {
    // 创建交易对象  
    const eip2930Tx = createEIP2930Transaction(
        chainId,
        nonce,
        feeData,
        gasLimit,
        from,
        to,
        value,
        data,
        accessList
    );

    // 签名交易  
    const { signedTx, txHash } = signEIP2930Transaction(eip2930Tx, privateKey);

    return {
        signedTx,
        txHash
    };
}

/**  
 * 创建EIP-2930交易对象  
 */
function createEIP2930Transaction(chainId, nonce, feeData, gasLimit, from, to, value, data, accessList) {
    // 0x01 || rlp([chainId, nonce, gasPrice, gasLimit, to, value, data, accessList, signatureYParity, signatureR, signatureS])
    return {
        type: 1, // EIP-2930交易类型  
        chainId: chainId,
        nonce: nonce,
        gasPrice: feeData.gasPrice || ethers.parseUnits("0.00000003", "gwei"), // 使用gasPrice  
        gasLimit: gasLimit,
        to: to, // 对于部署，这将是null  
        value: ethers.parseEther(value),
        data: data || "0x", // 合约字节码或函数调用数据  
        accessList: accessList || [] // EIP-2930特有的accessList  
    };
}

/**  
 * 签名EIP-2930交易函数  
 */
function signEIP2930Transaction(txData, privateKey) {
    // 1. 编码交易  
    const { rlpEncoded, rawTransaction } = encodeEIP2930Transaction(txData);

    // 2. 计算交易哈希 - 确保rlpEncoded是Buffer或Uint8Array  
    const txHash = keccak256(Buffer.from(rawTransaction));

    // 3. 准备私钥  
    const privKeyBytes = typeof privateKey === 'string' && privateKey.startsWith('0x')
        ? hexToBytes(privateKey.substring(2))
        : hexToBytes(privateKey);

    // 4. 使用私钥签名交易哈希  
    const sig = secp256k1.ecdsaSign(txHash, privKeyBytes);

    console.log(" ### ===> sig", sig);

    // 5. 从签名中提取r, s, v  
    const r = "0x" + bytesToHex(sig.signature.slice(0, 32));
    const s = "0x" + bytesToHex(sig.signature.slice(32, 64));

    // 计算 v 值 - EIP-2930 和 EIP-155 兼容  
    // 确保 v 是十六进制表示  
    // const v = "0x" + vi.toString(16);

    // 7. 计算 v 值 (对于 EIP-2930 必须是 0 或 1)  
    const v = "0x" + sig.recid.toString(16);

    console.log(" ### ===> signature.recid", sig.recid);

    // 0x01 || rlp([chainId, nonce, gasPrice, gasLimit, to, value, data, accessList, signatureYParity, signatureR, signatureS])
    // 6. 构建包含签名的完整交易字段  
    const signedFields = [
        txData.chainId,
        txData.nonce,
        txData.gasPrice,
        txData.gasLimit,
        txData.to || "0x",
        txData.value,
        txData.data || "0x",
        encodeAccessList(txData.accessList),
        v,
        r,
        s
    ];

    // 7. RLP编码签名后的交易  
    const signedRlpEncoded = RLP.encode(signedFields);

    // 8. 添加EIP-2930交易类型前缀 (0x01)  
    const signedTx = "0x01" + bytesToHex(signedRlpEncoded);
    // 9. 计算最终交易哈希 (交易ID)  
    const finalTxHash = keccak256(Buffer.from("0x01" + bytesToHex(signedRlpEncoded), 'hex'));

    return {
        signedTx,
        r,
        s,
        v,
        txHash: "0x" + bytesToHex(finalTxHash),
        encodedFields: signedFields
    };
}

/**  
 * RLP编码EIP-2930交易函数  
 */
function encodeEIP2930Transaction(txData) {
    // EIP-2930交易的字段顺序: [chainId, nonce, gasPrice, gasLimit, to, value, data, accessList, v, r, s]  
    const fields = [
        txData.chainId,
        txData.nonce,
        txData.gasPrice,
        txData.gasLimit,
        txData.to || "0x",
        txData.value,
        txData.data || "0x",
        encodeAccessList(txData.accessList)
    ];

    // 打印每个字段，用于调试  
    console.log("EIP-2930 Transaction Fields:", {
        chainId: fields[0],
        nonce: fields[1],
        gasPrice: fields[2],
        gasLimit: fields[3],
        to: fields[4],
        value: fields[5],
        data: fields[6].substring(0, 20) + "...", // 截断数据显示  
        accessList: fields[7]
    });

    // RLP encode transaction fields  
    const rlpEncoded = RLP.encode(fields);

    // 将交易类型前缀 (0x01) 添加到RLP编码前，用于计算哈希  
    const rawTransaction = Buffer.concat([
        Buffer.from([1]), // EIP-2930交易类型前缀  
        Buffer.from(rlpEncoded)
    ]);

    return {
        rlpEncoded,
        fields,
        rawTransaction,
        encodedHex: "0x01" + bytesToHex(rlpEncoded)
    };
}

/**  
 * 编码accessList  
 * EIP-2930的accessList是一个二维数组，格式为[[address, [storageKeys]], ...]  
 */
function encodeAccessList(accessList) {
    if (!accessList || accessList.length === 0) {
        return [];
    }

    return accessList.map(item => {
        return [
            item.address,
            item.storageKeys || []
        ];
    });
}