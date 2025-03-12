
const { expect } = require("chai");

// 处理交易正常的场景
async function handleTxOk(txHash, accountAddress, provider) {
    // const receipt = await provider.waitForTransaction(rawTxHash);
    // expect(1).to.equal(receipt.status);

    const transaction = await provider.getTransaction(txHash);
    // console.debug(" ### ===> transaction", transaction);
    expect(transaction).to.not.be.null;
    expect(transaction.from.toLowerCase()).to.equal(accountAddress.toLowerCase());


    const receipt = await provider.getTransactionReceipt(txHash);
    // console.debug(" ### ===> receipt", receipt);
    expect(receipt).to.not.be.null;
    expect(1).to.equal(receipt.status);
    expect(receipt.from.toLowerCase()).to.equal(accountAddress.toLowerCase());
}

/**
 * 处理交易失败的场景
 * 
 * @param {*} rawTxHash 
 * @param {*} accountAddress 
 * @param {*} error 
 * @param {*} provider 
 */
async function handleTxError(rawTxHash, accountAddress, error, provider) {
    /*
    错误的格式示例:
    error: {
    code: -32603,
    message: 'Error: Transaction reverted: non-payable function was called with value 1',
    data: {
        message: 'Error: Transaction reverted: non-payable function was called with value 1',
        txHash: '0x824b0bb911fd7dea90ebfad89a4836422dab51f4b3cb0fb72a1d0502f68b1bd9',
        data: '0x'
    }
    }
    */

    console.log(" ### ===> error", error);

    const txHash = error?.error?.data?.txHash;
    if (!txHash) {
        console.log(" ### ===> 交易失败, 没有找到txHash", error);
        // console.error(" ### ===> error", error);
        expect(false).to.be.true;
        return;
    }

    console.debug(" ### 交易失败, error", error);
    expect(txHash).to.equal(rawTxHash);

    const receipt = await provider.getTransactionReceipt(txHash);
    expect(receipt).to.not.be.null;
    expect(1).to.not.equal(receipt.status);
    expect(receipt.from.toLowerCase()).to.equal(accountAddress.toLowerCase());
    // console.debug(" ### ===> receipt", receipt);

    const transaction = await provider.getTransaction(txHash);
    expect(transaction).to.not.be.null;
    expect(transaction.from.toLowerCase()).to.equal(accountAddress.toLowerCase());
    // console.debug(" ### ===> transaction", transaction);
}

module.exports = {
    handleTxError,
    handleTxOk
}