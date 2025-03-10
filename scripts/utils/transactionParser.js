// transactionParser.js  
const { ethers, toBeHex, keccak256 } = require('ethers');
const { bytesToHex } = require("ethereum-cryptography/utils");
/**  
 * 解析已签名的以太坊交易  
 * @param {string} rawTxHash - 交易哈希  
 * @param {string} rawTx - 交易十六进制字符串  
 * @param {boolean} [verbose=true] - 是否输出详细日志  
 * @returns {object} 解析后的交易对象  
 * @throws {Error} 如果解析失败会抛出错误  
 */
function parseSignedTransaction(rawTxHash, rawTx, verbose = true) {
    try {
        // 解析交易  
        const parsedTx = ethers.Transaction.from(rawTx)

        // 格式化辅助函数  
        const formatEther = ethers.formatEther;
        const formatUnits = ethers.formatUnits;

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
                r: parsedTx.signature.r,
                s: parsedTx.signature.s,
                v: parsedTx.signature.v
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

        const serialized = parsedTx.serialized;
        const rawTxHash = "0x" + keccak256(serialized);
        console.log(" ### 1111 ===> rawTxHash", rawTxHash);
        const txHash = parsedTx.hash;

        // 如果需要详细输出  
        if (verbose) {
            console.log("=== 交易基本信息 ===");
            console.log("交易哈希:", txHash);
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

        if (txHash !== rawTxHash) {
            console.log(" ERROR ### rawTxHash: ", rawTxHash);
            console.log(" ERROR ### txHash: ", txHash);
            throw new Error("txHash !== rawTxHash");
        }

        if (serialized !== rawTx) {
            console.log(" ERROR ### serializedTx: ", serialized);
            console.log(" ERROR ### rawTx: ", rawTx);
            throw new Error("serialized !== rawTx");
        }

        return txHash;
    } catch (error) {
        console.error("解析签名交易失败: ", error);
        throw error;
    }
}

// 导出工具函数  
module.exports = {
    parseSignedTransaction
};  