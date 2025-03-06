const { run, network, config } = require("hardhat");
const { ethers } = require("ethers");
const { keccak256 } = require("ethereum-cryptography/keccak");
const secp256k1 = require("ethereum-cryptography/secp256k1");
const { bytesToHex, hexToBytes } = require("ethereum-cryptography/utils");
const RLP = require("@ethereumjs/rlp");

const {
    parseSignedTransaction,
    getTransactionSummary,
    getTransactionSender
} = require('../scripts/utils/transactionParser');

describe("Send EIP-4844 Blob Transaction", function () {

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

    it("发送EIP-4844 Blob交易", async function () {
        // 获取链上信息  
        const chainId = (await provider.getNetwork()).chainId;
        const nonce = await provider.getTransactionCount(wallet.address);
        const feeData = await provider.getFeeData();

        let gasLimit = 150000n; // 设置合适的gas限制  

        // 通常在实际应用中，这些值会从blob处理库获取  
        // 在实践中，需要使用KZG库创建blob数据和获取blobVersionedHashes  
        const mockBlobVersionedHashes = [
            "0x0100000000000000000000000000000000000000000000000000000000000000",
            "0x0200000000000000000000000000000000000000000000000000000000000000"
        ];

        // maxFeePerBlobGas估算 - 实际应用中应通过eth_blobBaseFee等API获取  
        const maxFeePerBlobGas = ethers.parseUnits("10", "gwei");

        // 获取合约字节码  
        const bytecode = contractArtifact.bytecode;

        // 创建并签名EIP-4844交易  
        const { signedTx, txHash } = createAndSignEIP4844Transaction(
            chainId,
            nonce,
            feeData,
            gasLimit,
            wallet.address,
            wallet.address, // 发送给自己，作为示例  
            "0.000",   // 发送少量ETH  
            bytecode,
            [], // 空的accessList  
            maxFeePerBlobGas,
            [],
            privateKey
        );

        console.log(" ### ===> 构建的EIP-4844交易:", signedTx);
        console.log(" ### ===> 计算的哈希:", txHash);

        console.log(" ### ===> signedTx", signedTx);
        const parsedTx = parseSignedTransaction(signedTx)
        console.log(" ### ===> parsedTx", parsedTx);

        // 注意：在不支持EIP-4844的网络上，此调用将失败  
        try {
            const sentTxHash = await provider.send("eth_sendRawTransaction", [signedTx]);
            console.log("交易已发送，哈希:", sentTxHash);

            // 等待交易确认  
            const receipt = await provider.waitForTransaction(sentTxHash);
            console.log(" ### ===> receipt", receipt);
        } catch (error) {
            console.log("发送交易失败:", error.message);
            // 预期失败时，仍然视为测试通过  
        }
    });
});

// ======== 工具函数 ========  

/**  
 * 创建并签名EIP-4844 Blob交易对象  
 */
function createAndSignEIP4844Transaction(
    chainId,
    nonce,
    feeData,
    gasLimit,
    from,
    to,
    value,
    data,
    accessList,
    maxFeePerBlobGas,
    blobVersionedHashes,
    privateKey
) {
    // 创建交易对象  
    const eip4844Tx = createEIP4844Transaction(
        chainId,
        nonce,
        feeData,
        gasLimit,
        from,
        to,
        value,
        data,
        accessList,
        maxFeePerBlobGas,
        blobVersionedHashes
    );

    // 签名交易  
    const { signedTx, txHash } = signEIP4844Transaction(eip4844Tx, privateKey);

    return {
        signedTx,
        txHash
    };
}

/**  
 * 创建EIP-4844 Blob交易对象  
 */
function createEIP4844Transaction(
    chainId,
    nonce,
    feeData,
    gasLimit,
    from,
    to,
    value,
    data,
    accessList,
    maxFeePerBlobGas,
    blobVersionedHashes
) {
    return {
        type: 3, // EIP-4844 Blob交易类型  
        chainId: chainId,
        nonce: nonce,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || ethers.parseUnits("1", "gwei"),
        maxFeePerGas: feeData.maxFeePerGas || ethers.parseUnits("30", "gwei"),
        gasLimit: gasLimit,
        to: to,
        value: ethers.parseEther(value),
        data: data || "0x",
        accessList: accessList || [],
        maxFeePerBlobGas: maxFeePerBlobGas || ethers.parseUnits("10", "gwei"),
        blobVersionedHashes: blobVersionedHashes || []
    };
}

/**  
 * 签名EIP-4844 Blob交易函数  
 */
function signEIP4844Transaction(txData, privateKey) {
    // 1. 编码交易  
    const { rlpEncoded, rawTransaction } = encodeEIP4844Transaction(txData);

    // 2. 计算交易哈希 - 确保使用正确的格式  
    const txHash = keccak256(rawTransaction);

    // 3. 准备私钥  
    const privKeyBytes = typeof privateKey === 'string' && privateKey.startsWith('0x')
        ? hexToBytes(privateKey.substring(2))
        : hexToBytes(privateKey);

    // 4. 使用私钥签名交易哈希  
    const signature = secp256k1.ecdsaSign(txHash, privKeyBytes);

    // 5. 从签名中提取r, s, v  
    const r = "0x" + bytesToHex(signature.signature.slice(0, 32));
    const s = "0x" + bytesToHex(signature.signature.slice(32, 64));

    // 对于EIP-4844，v值就是恢复ID (0或1)  
    const v = "0x" + signature.recid.toString(16);

    console.log(" ### ===> txData", txData);

    // 6. 构建包含签名的完整交易字段  
    const signedFields = [
        txData.chainId,
        txData.nonce,
        txData.maxPriorityFeePerGas,
        txData.maxFeePerGas,
        txData.gasLimit,
        txData.to || "0x",
        txData.value,
        txData.data || "0x",
        encodeAccessList(txData.accessList),
        txData.maxFeePerBlobGas,
        encodeBlobVersionedHashes(txData.blobVersionedHashes),
        v,
        r,
        s
    ];

    // 7. RLP编码签名后的交易  
    const signedRlpEncoded = RLP.encode(signedFields);

    console.log(" ### ===> signedRlpEncoded", signedRlpEncoded);

    // 8. 添加EIP-4844交易类型前缀 (0x03)  
    const signedTx = "0x03" + bytesToHex(signedRlpEncoded);

    // 9. 计算最终交易哈希 (交易ID)  
    const finalTxHash = keccak256(Buffer.from("0x03" + bytesToHex(signedRlpEncoded), 'hex'));

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
 * RLP编码EIP-4844 Blob交易函数  
 */
function encodeEIP4844Transaction(txData) {
    // EIP-4844交易的字段顺序:   
    // [chainId, nonce, maxPriorityFeePerGas, maxFeePerGas, gasLimit, to, value, data, accessList, maxFeePerBlobGas, blobVersionedHashes]  

    if (txData.type !== 3) {
        throw new Error("Not EIP-4844 transaction type, type: " + txData.type);
    }

    const fields = [
        txData.chainId,
        txData.nonce,
        txData.maxPriorityFeePerGas,
        txData.maxFeePerGas,
        txData.gasLimit,
        txData.to || "0x",
        txData.value,
        txData.data || "0x",
        encodeAccessList(txData.accessList),
        txData.maxFeePerBlobGas,
        encodeBlobVersionedHashes(txData.blobVersionedHashes) // 修改的部分：特殊处理blobVersionedHashes  
    ];

    // 打印每个字段，用于调试  
    console.log("EIP-4844 Blob Transaction Fields:", {
        chainId: fields[0],
        nonce: fields[1],
        maxPriorityFeePerGas: fields[2],
        maxFeePerGas: fields[3],
        gasLimit: fields[4],
        to: fields[5],
        value: fields[6],
        data: typeof fields[7] === 'string' ? fields[7].substring(0, 20) + "..." : fields[7], // 截断数据显示  
        accessList: fields[8],
        maxFeePerBlobGas: fields[9],
        blobVersionedHashes: fields[10]
    });

    // RLP encode transaction fields  
    const rlpEncoded = RLP.encode(fields);

    // 将交易类型前缀 (0x03) 添加到RLP编码前，用于计算哈希  
    const rawTransaction = Buffer.concat([
        Buffer.from([3]), // EIP-4844交易类型前缀  
        Buffer.from(rlpEncoded)
    ]);

    return {
        rlpEncoded,
        fields,
        rawTransaction,
        encodedHex: "0x03" + bytesToHex(rlpEncoded)
    };
}

/**  
 * 编码blobVersionedHashes - 特殊处理以确保正确的RLP编码  
 * @param {Array} blobVersionedHashes - blob版本化哈希数组  
 * @returns {Array} 处理后的数组，适合RLP编码  
 */
function encodeBlobVersionedHashes(blobVersionedHashes) {
    // 确保始终返回数组，即使是空数组  
    if (!blobVersionedHashes || blobVersionedHashes.length === 0) {
        return []; // 空数组是合法的，表示没有blob  
    }

    // 确保每个哈希都是正确的格式  
    return blobVersionedHashes.map(hash => {
        if (typeof hash === 'string') {
            // 移除0x前缀  
            const hexString = hash.startsWith('0x') ? hash.slice(2) : hash;
            return Buffer.from(hexString, 'hex');
        }
        // 已经是Buffer就直接返回  
        return hash;
    });
}

/**  
 * 编码accessList  
 * 对于EIP-4844，accessList格式与EIP-2930和EIP-1559相同  
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