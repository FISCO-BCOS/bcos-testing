// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract GasDeduction {
    uint256 public value;
    
    event GasLeft(uint256 gasLeft);
    event ValueChanged(uint256 newValue);
    
    // 消耗固定量的gas
    function consumeGas(uint256 iterations) public {
        uint256 startGas = gasleft();
        
        for(uint256 i = 0; i < iterations; i++) {
            value += 1;
            emit ValueChanged(value);
        }
        
        uint256 gasUsed = startGas - gasleft();
        emit GasLeft(gasleft());
    }
    
    // 在消耗gas后回滚
    function consumeGasAndRevert(uint256 iterations) public {
        uint256 startGas = gasleft();
        
        for(uint256 i = 0; i < iterations; i++) {
            value += 1;
            emit ValueChanged(value);
        }
        
        emit GasLeft(gasleft());
        revert("Transaction reverted after gas consumption");
    }
    
    // 检查剩余gas
    function checkGasLeft() public view returns (uint256) {
        return gasleft();
    }
} 