// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Overflow {
    uint8 public smallNumber;
    
    event NumberChanged(uint8 oldValue, uint8 newValue);
    
    // Solidity 0.8.x 默认会检查溢出，这个函数会抛出异常
    function increment(uint8 value) public {
        uint8 oldValue = smallNumber;
        smallNumber += value;
        emit NumberChanged(oldValue, smallNumber);
    }
    
    // 使用 unchecked 块来模拟 0.8.x 之前的行为
    function unsafeIncrement(uint8 value) public {
        uint8 oldValue = smallNumber;
        unchecked {
            smallNumber += value;
        }
        emit NumberChanged(oldValue, smallNumber);
    }
} 