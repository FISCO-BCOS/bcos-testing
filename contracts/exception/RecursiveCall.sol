// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract RecursiveCall {
    uint256 public counter;
    uint256 public maxDepth;
    
    event DepthReached(uint256 depth);
    error MaxDepthExceeded(uint256 depth);
    
    constructor(uint256 _maxDepth) {
        require(_maxDepth > 0, "Max depth must be greater than 0");
        maxDepth = _maxDepth;
    }
    
    function recursiveIncrement(uint256 depth) public {
        if (depth > maxDepth) {
            revert MaxDepthExceeded(depth);
        }
        
        counter++;
        emit DepthReached(depth);
        
        if (depth < maxDepth) {
            this.recursiveIncrement(depth + 1);
        }
    }
    
    function recursiveIncrementUnsafe(uint256 depth) public {
        counter++;
        emit DepthReached(depth);
        
        // 无限递归，直到耗尽gas或达到调用栈限制
        this.recursiveIncrementUnsafe(depth + 1);
    }
    
    // 使用循环代替递归的安全实现
    function iterativeIncrement(uint256 count) public {
        require(count <= maxDepth, "Count exceeds max depth");
        
        for(uint256 i = 0; i < count; i++) {
            counter++;
            emit DepthReached(i + 1);
        }
    }
} 