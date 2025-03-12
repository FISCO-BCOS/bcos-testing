// transactionCreator.js  
const { ethers } = require("ethers");
const { keccak256 } = require("ethereum-cryptography/keccak");
const { bytesToHex, hexToBytes } = require("ethereum-cryptography/utils");
const RLP = require("@ethereumjs/rlp");
const { TransactionType } = require("./transactionType");
/**
 * 创建交易并签名交易
 * 
 * @param {*} txType 
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
function createTransaction(txType, chainId, nonce, feeData, gasLimit, from, to, value, data, wallet) {

    if (txType === TransactionType.LegacyTx) {
        return createLegacyTransaction(chainId, nonce, feeData, gasLimit, from, to, value, data, wallet);
    } else if (txType === TransactionType.Eip2930) {
        return createEip2930Transaction(chainId, nonce, feeData, gasLimit, from, to, value, data, wallet);
    } else if (txType === TransactionType.Eip1559) {
        return createEip1559Transaction(chainId, nonce, feeData, gasLimit, from, to, value, data, wallet);
    } else if (txType === TransactionType.Eip4844) {
        return createEip4844Transaction(chainId, nonce, feeData, gasLimit, from, to, value, data, wallet);
    } else {
        console.error("Invalid transaction type, " + txType);
        throw new Error("Invalid transaction type");
    }
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
function createLegacyTransaction(chainId, nonce, feeData, gasLimit, from, to, value, data, wallet) {

    //TODO:
    // const gasPrice = ethers.parseUnits("0.0003", "gwei");
    const gasPrice = feeData.gasPrice || ethers.parseUnits("0.0000003", "gwei");

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


/**
 * 创建EIP-1559交易并签名交易
 * 
 * @param {*} chainId 
 * @param {*} nonce 
 * @param {*} feeData 
 * @param {*} gasLimit 
 * @param {*} from 
 * @param {*} to 
 * @param {*} value 
 * @param {*} data  
 * @param {*} accessList 
 * @param {*} wallet 
 * @returns 
 */
function createEip1559Transaction(chainId, nonce, feeData, gasLimit, from, to, value, data, accessList, wallet) {

    // const gasPrice = feeData.gasPrice || ethers.parseUnits("30", "gwei");

    // console.log(" ### ===> feeData", feeData);

    const maxFeePerGas = /*feeData.maxFeePerGas ||*/ ethers.parseUnits("0.0000003", "gwei");
    const maxPriorityFeePerGas = /*feeData.maxPriorityFeePerGas ||*/ ethers.parseUnits("0.00000001", "gwei");

    // EIP1559 交易的字段顺序: 0x02 || rlp([chain_id, nonce, max_priority_fee_per_gas, max_fee_per_gas, gas_limit, destination, amount, data, access_list, signature_y_parity, signature_r, signature_s]) 
    const fields = [
        chainId,
        nonce,
        maxPriorityFeePerGas,
        maxFeePerGas,
        gasLimit,
        to || "0x",
        value,
        data || "0x",
        accessList || []
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
        data: fields[7].substring(0, 20) + "...",
        accessList: fields[8]
    });

    // RLP encode transaction fields
    const rlpEncoded = RLP.encode(fields);

    const txType = Buffer.from([2]); // EIP-1559类型前缀
    const dataToHash = Buffer.concat([txType, Buffer.from(rlpEncoded)]);
    const txHash = keccak256(dataToHash);

    // 签名哈希  
    const signature = wallet.signingKey.sign(txHash);
    const r = signature.r;
    const s = signature.s;
    const y = signature.yParity;
    // 构建包含签名的完整交易字段  
    const signedFields = [...fields, y, r, s];

    console.log(" ### ===> signedFields", signedFields);

    // RLP编码签名后的交易
    const signedRlpEncoded = RLP.encode(signedFields);

    // 添加EIP-1559交易类型前缀(0x02)
    const signedTx = "0x02" + bytesToHex(signedRlpEncoded);
    // 交易哈希
    const rawTxHash = "0x" + bytesToHex(keccak256(Buffer.from(hexToBytes(signedTx))));

    console.debug("EIP-1559 Transaction Sign Tx:", {
        signedTx: signedTx,
        txHash: rawTxHash
    });

    return {
        signedTx,
        rawTxHash: rawTxHash
    };
}


/**
 * 创建EIP-2930交易并签名交易
 * 
 * @param {*} chainId 
 * @param {*} nonce 
 * @param {*} feeData 
 * @param {*} gasLimit 
 * @param {*} from 
 * @param {*} to 
 * @param {*} value 
 * @param {*} data  
 * @param {*} accessList 
 * @param {*} wallet 
 * @returns 
 */
function createEip2930Transaction(chainId, nonce, feeData, gasLimit, from, to, value, data, accessList, wallet) {

    const gasPrice = feeData.gasPrice || ethers.parseUnits("30", "gwei");

    const maxFeePerGas = /*feeData.maxFeePerGas ||*/ ethers.parseUnits("0.0000003", "gwei");
    const maxPriorityFeePerGas = /*feeData.maxPriorityFeePerGas ||*/ ethers.parseUnits("0.00000001", "gwei");

    // 0x01 || rlp([chainId, nonce, gasPrice, gasLimit, to, value, data, accessList, signatureYParity, signatureR, signatureS])
    const fields = [
        chainId,
        nonce,
        gasPrice,
        gasLimit,
        to || "0x",
        value,
        data || "0x",
        accessList || []
    ];

    // 打印每个字段，用于调试
    console.log("EIP-2930 Transaction Fields:", {
        chainId: fields[0],
        nonce: fields[1],
        gasPrice: fields[2],
        gasLimit: fields[3],
        to: fields[4],
        value: fields[5],
        data: fields[6].substring(0, 20) + "...",
        accessList: fields[7]
    });

    // RLP encode transaction fields
    const rlpEncoded = RLP.encode(fields);

    const txType = Buffer.from([1]); // EIP-2930类型前缀
    const dataToHash = Buffer.concat([txType, Buffer.from(rlpEncoded)]);
    const txHash = keccak256(dataToHash);

    // 签名哈希  
    const signature = wallet.signingKey.sign(txHash);
    const r = signature.r;
    const s = signature.s;
    const y = signature.yParity;
    // 构建包含签名的完整交易字段  
    const signedFields = [...fields, y, r, s];

    console.log(" ### ===> signedFields", signedFields);

    // RLP编码签名后的交易
    const signedRlpEncoded = RLP.encode(signedFields);

    // 添加EIP-1559交易类型前缀(0x01)
    const signedTx = "0x01" + bytesToHex(signedRlpEncoded);

    // 交易哈希
    const rawTxHash = "0x" + bytesToHex(keccak256(Buffer.from(hexToBytes(signedTx))));

    console.debug("EIP-2930 Transaction Sign Tx:", {
        signedTx: signedTx,
        txHash: rawTxHash
    });

    return {
        signedTx,
        rawTxHash: rawTxHash
    };
}

/**
 * 创建EIP-4844交易并签名交易
 * 
 * @param {*} chainId 
 * @param {*} nonce 
 * @param {*} feeData 
 * @param {*} gasLimit 
 * @param {*} from 
 * @param {*} to 
 * @param {*} value 
 * @param {*} data  
 * @param {*} accessList 
 * @param {*} wallet 
 * @returns 
 */
function createEip4844Transaction(chainId, nonce, feeData, gasLimit, from, to, value, data, accessList, wallet) {
    // TODO: 实现EIP-4844交易创建和签名
}

// 导出模块
module.exports = {
    createTransaction,
    createLegacyTransaction,
    createEip1559Transaction,
    createEip2930Transaction,
    createEip4844Transaction
};

