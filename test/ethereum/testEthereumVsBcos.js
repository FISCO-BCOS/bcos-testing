const {
    loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { config } = require("hardhat")
const hre = require("hardhat");
const { expect, AssertionError } = require("chai");
const { networks } = require("../../hardhat.config");
const { createTransaction } = require("../../scripts/utils/transactionCreator");
const { TransactionType } = require("../../scripts/utils/transactionType");

// 测试以太坊与Fisco Bcosnet的交易、交易回执、区块的结构是否一致
/*
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract Empty {
    event EmptyEvent();

    constructor() {
        emit EmptyEvent();
    }

    function emitEvent() public {
        emit EmptyEvent();
    }
}
*/

describe("Ethereum vs Potos: Data Structure Comparison", function () {

    // 测试的合约名字
    const contractName = "Empty";
    const contractAbi = "[{\"inputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"constructor\"},{\"anonymous\":false,\"inputs\":[],\"name\":\"EmptyEvent\",\"type\":\"event\"},{\"inputs\":[],\"name\":\"emitEvent\",\"outputs\":[],\"stateMutability\":\"nonpayable\",\"type\":\"function\"}]";
    // 
    const contractBytecode = "0x6080604052348015600e575f5ffd5b506040517fcf16a92280c1bbb43f72d31126b724d508df2877835849e8744017ab36a9b47f905f90a160928060425f395ff3fe6080604052348015600e575f5ffd5b50600436106026575f3560e01c80637b0cb83914602a575b5f5ffd5b60306032565b005b6040517fcf16a92280c1bbb43f72d31126b724d508df2877835849e8744017ab36a9b47f905f90a156fea2646970667358221220b26bf8d47ffaa4c5ffecf6303ac218970d8ab50724943980b859fc2ac8e384e164736f6c634300081c0033";

    const contractEmitData = new ethers.Interface(contractAbi).encodeFunctionData("emitEvent", []);

    // === bcos 网络参数 ===  
    const bcosnetUrl = networks.bcosnet.url;
    const bcosnetChainId = networks.bcosnet.chainId;

    // === sepolia 网络参数 ===  
    const sepoliaUrl = "http://127.0.0.1:8545";
    const sepoliaChainId = 11155111;

    // === hardhat 网络参数 ===  
    const hardhatUrl = "http://127.0.0.1:8545";
    const hardhatChainId = 31337;

    // === bcosnet provider ===  
    const bcosnetProvider = new ethers.JsonRpcProvider(bcosnetUrl, { chainId: bcosnetChainId, name: "bcosnet" }, {
        staticNetwork: true
    });

    // === sepolia provider ===  
    const sepoliaProvider = new ethers.JsonRpcProvider(sepoliaUrl, { chainId: sepoliaChainId, name: "sepolia" }, {
        staticNetwork: true,
        timeout: 120000 // 120秒
    });

    // === hardhat provider ===  
    const hardhatProvider = new ethers.JsonRpcProvider(hardhatUrl, { chainId: hardhatChainId, name: "hardhat" }, {
        staticNetwork: true,
        timeout: 120000 // 120秒
    });

    console.log(" ### ===> networks: ", networks);

    async function getTxAndBlock(txHash, provider) {

        const transaction = await provider.send("eth_getTransactionByHash", [txHash]);
        expect(transaction).to.not.be.null;
        const receipt = await provider.send("eth_getTransactionReceipt", [txHash]);
        expect(receipt).to.not.be.null;
        const blockNumber = transaction.blockNumber;
        expect(blockNumber).to.not.be.null;
        const block = await provider.send("eth_getBlockByNumber", [blockNumber, true]);
        expect(block).to.not.be.null;

        return {
            transaction,
            receipt,
            block
        }
    }

    // JSON递归对比函数
    function compareJsonObjects(objA, objB, path = '') {

        const differences = {};

        // 获取对象的所有键
        const keysA = Object.keys(objA);
        const keysB = Object.keys(objB);

        // console.log(" ### ===> keysA: ", keysA);
        // console.log(" ### ===> keysB: ", keysB);

        // 检查 objA 中有而 objB 中没有的字段
        keysA.forEach(key => {
            // console.log(" ### A ===> key: ", key);
            const currentPath = path ? `${path}.${key}` : key;
            if (!objB.hasOwnProperty(key)) {
                differences[currentPath] = `Missing in second JSON, key: ${key}, value: ${JSON.stringify(objA[key])}`;
            } else if (typeof objA[key] !== typeof objB[key]) {
                // 检查类型是否相同
                differences[currentPath] = `Type mismatch: ${typeof objA[key]} (first JSON) vs ${typeof objB[key]} (second JSON)`;
            } else if (typeof objA[key] === 'object' && objA[key] !== null && objB[key] !== null) {
                // 如果值是对象，递归对比
                compareJsonObjects(objA[key], objB[key], currentPath);
            }
        });

        // 检查 objB 中有而 objA 中没有的字段
        keysB.forEach(key => {
            //console.log(" ### B ===> key: ", key);
            const currentPath = path ? `${path}.${key}` : key;
            if (!objA.hasOwnProperty(key)) {
                differences[currentPath] = `Missing in first JSON, key: ${key}, value: ${JSON.stringify(objB[key])}`;
            }
        });

        return differences;
    }

    // 工厂函数，返回 fixture 函数
    function createCallEmptyContractFixture(txType, wallet, provider) {
        return async function CallEmptyContractFixture() {

            // const wallet = new ethers.Wallet(account, null);
            const accountAddress = wallet.address;

            // console.log(" ### ===> wallet: ", wallet);
            // console.log(" ### ===> accountAddress: ", accountAddress);

            // === 步骤: 交易参数 ===  
            const chainId = parseInt(await provider.send('eth_chainId', []), 16);
            const feeData = await provider.getFeeData();
            const from = accountAddress;
            const to = null; // 合约部署，to为null 
            const value = 0; // 不发送ETH  
            const gasLimit = 220000; // 为合约部署设置合适的gas限制  
            // const gasLimit = 22000000n; // 为合约部署设置合适的gas限制  

            let contractAddress = null;
            let nonce = 0;
            // === 部署合约 === 
            {
                nonce = await provider.getTransactionCount(accountAddress);
                const { signedTx, rawTxHash } = createTransaction(
                    txType,
                    chainId,
                    nonce,
                    feeData,
                    gasLimit,
                    from,
                    to,
                    value,
                    contractBytecode,
                    wallet
                );
                nonce++;

                try {
                    txHash = await provider.send("eth_sendRawTransaction", [signedTx]);
                    console.log("部署合约交易已发送，哈希:", txHash);
                    expect(txHash).to.equal(rawTxHash);
                } catch (error) {

                    console.log("部署合约交易失败:", error);

                    if (error.message.includes("could not replace existing tx")
                        || error.message.includes("already known")
                    ) {
                        console.log("交易已经存在，交易哈希:", rawTxHash);
                        txHash = rawTxHash;
                    } else {
                        console.error("部署合约交易失败，错误:", error);
                        throw error;
                    }
                }

                // === 等待交易确认 ===  
                const receipt = await provider.waitForTransaction(txHash);
                console.log("部署合约交易交易回执receipt: ", receipt);
                expect(1).to.equal(receipt.status);

                contractAddress = receipt.contractAddress;
                console.log("合约部署成功, 合约地址: contractAddress: ", contractAddress);
            }

            // === 调用合约 ===  
            {
                // emitEvent接口abi编码
                const data = contractEmitData;

                // const nonce = await provider.getTransactionCount(accountAddress);
                const { signedTx, rawTxHash } = createTransaction(
                    txType,
                    chainId,
                    nonce,
                    feeData,
                    gasLimit,
                    from,
                    contractAddress,
                    value,
                    data,
                    wallet
                );

                try {
                    // === 步骤: 发送交易 ===  
                    const txHash = await provider.send("eth_sendRawTransaction", [signedTx]);
                    console.log("调用合约, 交易已发送，哈希:", txHash);
                    expect(txHash).to.equal(rawTxHash);

                    // === 步骤: 等待交易确认 ===  
                    const receipt = await provider.waitForTransaction(txHash);

                    expect(1).to.equal(receipt.status);

                    return txHash;
                } catch (error) {

                    if (error instanceof AssertionError) {
                        throw error
                    }

                    throw error;
                }
            }
        };
    }

    // 普通交易
    it("Legacy Transaction", async function () {


        const wallet1 = new ethers.Wallet(config.accounts[0], null);
        // const accountAddress = wallet.address;

        // fb 部署合约
        const callEmptyContractFixture1 = createCallEmptyContractFixture(TransactionType.LegacyTx, wallet1, bcosnetProvider);
        // const txHash = await loadFixture(callEmptyContractFixture);
        // console.log(" ### ===> txHash: ", txHash);

        const { transaction: bcosTransaction, receipt: bcosReceipt, block: bcosBlock } = await getTxAndBlock(await loadFixture(callEmptyContractFixture1), bcosnetProvider)

        // console.log(" ### ===> transaction: ", transaction);
        // console.log(" ### ===> receipt: ", receipt);
        // console.log(" ### ===> block: ", block);



        const wallet2 = new ethers.Wallet(config.accounts[0], null);
        // const accountAddress = wallet.address;

        // hardhat 部署合约
        const callEmptyContractFixture2 = createCallEmptyContractFixture(TransactionType.LegacyTx, wallet2, hardhatProvider);
        // const txHash = await loadFixture(callEmptyContractFixture);
        // console.log(" ### ===> txHash: ", txHash);

        const { transaction: hardhatTransaction, receipt: hardhatReceipt, block: hardhatBlock } = await getTxAndBlock(await loadFixture(callEmptyContractFixture2), hardhatProvider)

        // console.log(" ### ===> transaction1: ", transaction1);
        // console.log(" ### ===> transaction2: ", transaction2);
        // console.log(" ### ===> receipt: ", receipt);
        // console.log(" ### ===> block: ", block);

        // 交易参数对比
        const txDiff = compareJsonObjects(bcosTransaction, hardhatTransaction);
        // console.log(" ### ===> txDiff: ", txDiff);

        // console.log(" ### ===> receipt1: ", receipt1);
        // console.log(" ### ===> receipt2: ", receipt2);

        // 交易回执对比 
        const txReceiptDiff = compareJsonObjects(bcosReceipt, hardhatReceipt);
        // console.log(" ### ===> txReceiptDiff: ", txReceiptDiff);

        console.log(" ### ===> bcosBlock: ", JSON.stringify(bcosBlock));
        console.log(" ### ===> hardhatBlock: ", JSON.stringify(hardhatBlock));

        // 交易区块对比
        const txBlockDiff = compareJsonObjects(bcosBlock, hardhatBlock);
        console.log(" ### ===> txBlockDiff: ", txBlockDiff);

    });


    // EIP1559交易
    it("EIP1559 Transaction", function () {



    });

    // EIP2930交易
    it("EIP2930 Transaction", function () {



    });

    // EIP4844交易
    it("EIP4844 Transaction", function () {

    });


});
