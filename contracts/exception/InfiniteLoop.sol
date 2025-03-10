// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract InfiniteLoop {
    uint256 public counter;
    
    event CounterIncremented(uint256 value);
    
    // 无限循环函数 - 会消耗所有gas
    function infiniteLoop() public {
        while (true) {
            counter++;
            emit CounterIncremented(counter);
        }
    }
    
    // 可控循环函数 - 用于对比
    function controlledLoop(uint256 iterations) public {
        for (uint256 i = 0; i < iterations; i++) {
            counter++;
            emit CounterIncremented(counter);
        }
    }
    
    // 带有gas检查的循环
    function safeLoop(uint256 iterations) public {
        uint256 startGas = gasleft();
        uint256 gasPerIteration;
        
        for (uint256 i = 0; i < iterations; i++) {
            if (i == 1) {
                gasPerIteration = startGas - gasleft();
            }
            
            if (gasleft() < gasPerIteration) {
                break;
            }
            
            counter++;
            emit CounterIncremented(counter);
        }
    }
} 