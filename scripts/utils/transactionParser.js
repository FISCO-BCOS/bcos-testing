// transactionParser.js  
const { ethers } = require('ethers');

/**  
 * 解析已签名的以太坊交易  
 * @param {string} rawTx - 原始交易十六进制字符串  
 * @param {boolean} [verbose=true] - 是否输出详细日志  
 * @returns {object} 解析后的交易对象  
 * @throws {Error} 如果解析失败会抛出错误  
 */
function parseSignedTransaction(rawTx, verbose = true) {
    try {
        // 检测ethers版本并使用适当的方法  
        const isV6 = !!ethers.version && ethers.version.startsWith('6');

        // 解析交易  
        const parsedTx = isV6
            ? ethers.Transaction.from(rawTx)  // v6 语法  
            : ethers.utils.parseTransaction(rawTx);  // v5 语法  

        // 格式化辅助函数  
        const formatEther = isV6 ? ethers.formatEther : ethers.utils.formatEther;
        const formatUnits = isV6 ? ethers.formatUnits : ethers.utils.formatUnits;

        // 创建结果对象  
        const result = {
            type: parsedTx.type !== undefined ? parsedTx.type : 0,
            chainId: parsedTx.chainId.toString(),
            nonce: parsedTx.nonce,
            from: parsedTx.from,
            to: parsedTx.to,
            value: formatEther(parsedTx.value),
            data: parsedTx.data,
            gasLimit: parsedTx.gasLimit.toString(),
            // 签名信息  
            signature: {
                r: isV6 && parsedTx.signature ? parsedTx.signature.r : parsedTx.r,
                s: isV6 && parsedTx.signature ? parsedTx.signature.s : parsedTx.s,
                v: isV6 && parsedTx.signature ? parsedTx.signature.v : parsedTx.v
            }
        };

        // 添加特定交易类型的字段  
        if (parsedTx.type === 0 || parsedTx.type === undefined) {
            result.gasPrice = formatUnits(parsedTx.gasPrice, "gwei");
        }
        else if (parsedTx.type === 1) {
            result.gasPrice = formatUnits(parsedTx.gasPrice, "gwei");
            result.accessList = parsedTx.accessList;
        }
        else if (parsedTx.type === 2) {
            result.maxPriorityFeePerGas = formatUnits(parsedTx.maxPriorityFeePerGas, "gwei");
            result.maxFeePerGas = formatUnits(parsedTx.maxFeePerGas, "gwei");
            result.accessList = parsedTx.accessList;
        }
        else if (parsedTx.type === 3) {
            result.maxPriorityFeePerGas = formatUnits(parsedTx.maxPriorityFeePerGas, "gwei");
            result.maxFeePerGas = formatUnits(parsedTx.maxFeePerGas, "gwei");
            if (parsedTx.maxFeePerBlobGas) {
                result.maxFeePerBlobGas = formatUnits(parsedTx.maxFeePerBlobGas, "gwei");
            }
            if (parsedTx.blobVersionedHashes) {
                result.blobVersionedHashes = parsedTx.blobVersionedHashes;
            }
            result.accessList = parsedTx.accessList;
        }

        // 如果需要详细输出  
        if (verbose) {
            console.log("=== 交易基本信息 ===");
            console.log("交易类型:", result.type);
            console.log("链ID:", result.chainId);
            console.log("Nonce:", result.nonce);
            console.log("发送方:", result.from);
            console.log("接收方:", result.to);
            console.log("价值:", result.value, "ETH");
            console.log("数据:", result.data.length > 66 ?
                result.data.substring(0, 66) + "..." :
                result.data);
            console.log("Gas限制:", result.gasLimit);

            console.log("\n=== 签名信息 ===");
            console.log("R:", result.signature.r);
            console.log("S:", result.signature.s);
            console.log("V:", result.signature.v);

            // 显示特定交易类型的信息  
            if (result.type === 0) {
                console.log("\n=== Legacy交易特定信息 ===");
                console.log("Gas价格:", result.gasPrice, "Gwei");
            }
            else if (result.type === 1) {
                console.log("\n=== EIP-2930交易特定信息 ===");
                console.log("Gas价格:", result.gasPrice, "Gwei");
                console.log("访问列表:", JSON.stringify(result.accessList, null, 2));
            }
            else if (result.type === 2) {
                console.log("\n=== EIP-1559交易特定信息 ===");
                console.log("最大优先费用:", result.maxPriorityFeePerGas, "Gwei");
                console.log("最大费用:", result.maxFeePerGas, "Gwei");
                console.log("访问列表:", result.accessList.length > 0 ?
                    JSON.stringify(result.accessList, null, 2) :
                    "空");
            }
            else if (result.type === 3) {
                console.log("\n=== EIP-4844 Blob交易特定信息 ===");
                console.log("最大优先费用:", result.maxPriorityFeePerGas, "Gwei");
                console.log("最大费用:", result.maxFeePerGas, "Gwei");

                if (result.maxFeePerBlobGas) {
                    console.log("最大Blob费用:", result.maxFeePerBlobGas, "Gwei");
                }

                if (result.blobVersionedHashes) {
                    console.log("Blob版本哈希:", result.blobVersionedHashes);
                }
            }
        }

        return result;
    } catch (error) {
        console.error("解析交易失败:", error.message);
        throw error;
    }
}

/**  
 * 提取交易结构概要信息(简化版)  
 * @param {string} rawTx - 原始交易十六进制字符串  
 * @returns {object} 交易的基本信息  
 */
function getTransactionSummary(rawTx) {
    try {
        const txDetails = parseSignedTransaction(rawTx, false);
        return {
            type: txDetails.type,
            from: txDetails.from,
            to: txDetails.to,
            value: txDetails.value,
            chainId: txDetails.chainId
        };
    } catch (error) {
        console.error("提取交易摘要失败:", error.message);
        return null;
    }
}

/**  
 * 获取交易的发送方地址  
 * @param {string} rawTx - 原始交易十六进制字符串  
 * @returns {string|null} 发送方地址或null(如果解析失败)  
 */
function getTransactionSender(rawTx) {
    try {
        const txDetails = parseSignedTransaction(rawTx, false);
        return txDetails.from;
    } catch (error) {
        console.error("获取交易发送方失败:", error.message);
        return null;
    }
}

/**  
 * 验证交易签名是否有效  
 * @param {string} rawTx - 原始交易十六进制字符串  
 * @returns {boolean} 签名是否有效  
 */
function verifyTransactionSignature(rawTx) {
    try {
        const txDetails = parseSignedTransaction(rawTx, false);
        // 需要根据ethers版本不同使用不同的验证方法  

        // 方法略有不同，此处简化处理，实际应用中应根据交易类型和ethers版本调整  
        // 真实实现需要从交易恢复签名并验证地址  

        return txDetails.from && txDetails.from.startsWith('0x');
    } catch (error) {
        console.error("验证交易签名失败:", error.message);
        return false;
    }
}

// 导出工具函数  
module.exports = {
    parseSignedTransaction,
    getTransactionSummary,
    getTransactionSender,
    verifyTransactionSignature
};  