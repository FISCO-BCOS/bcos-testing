// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract BlockInfo {
    // 存储一些调用信息，用于后续验证
    struct CallInfo {
        address msgSender;
        address txOrigin;
        bytes4 msgSig;
        uint256 msgValue;
        bytes msgData;
        uint256 gasLeft;
        uint256 gasPrice;
    }
    
    // 存储区块信息
    struct BlockData {
        uint256 number;
        uint256 timestamp;
        address coinbase;
        uint256 difficulty;
        uint256 gaslimit;
        uint256 chainid;
        uint256 basefee;
        uint256 prevrandao;
        bytes32 blobhash;   // 区块的blob哈希
    }
    
    // 存储最近一次调用的信息
    CallInfo public lastCallInfo;
    BlockData public lastBlockInfo;
    
    // 事件声明
    event BlockInfoCaptured(BlockData blockInfo);
    event CallInfoCaptured(CallInfo callInfo);
    
    // 捕获当前区块信息
    function captureBlockInfo() public returns (BlockData memory) {
        BlockData memory currentBlock = BlockData({
            number: block.number,
            timestamp: block.timestamp,
            coinbase: block.coinbase,
            difficulty: block.difficulty,
            gaslimit: block.gaslimit,
            chainid: block.chainid,
            basefee: block.basefee,
            prevrandao: block.prevrandao,
            blobhash: blobhash(0)
        });
        
        lastBlockInfo = currentBlock;
        emit BlockInfoCaptured(currentBlock);
        return currentBlock;
    }
    
    // 捕获当前调用信息
    function captureCallInfo() public payable returns (CallInfo memory) {
        CallInfo memory currentCall = CallInfo({
            msgSender: msg.sender,
            txOrigin: tx.origin,
            msgSig: msg.sig,
            msgValue: msg.value,
            msgData: msg.data,
            gasLeft: gasleft(),
            gasPrice: tx.gasprice
        });
        
        lastCallInfo = currentCall;
        emit CallInfoCaptured(currentCall);
        return currentCall;
    }
    
    // 获取最新区块信息
    function getLastBlockInfo() public view returns (BlockData memory) {
        return lastBlockInfo;
    }
    
    // 获取最新调用信息
    function getLastCallInfo() public view returns (CallInfo memory) {
        return lastCallInfo;
    }
} 