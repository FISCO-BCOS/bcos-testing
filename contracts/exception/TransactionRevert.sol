// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract TransactionRevert {
    uint256 public value;
    
    event ValueSet(uint256 oldValue, uint256 newValue);
    event BeforeRevert(uint256 value);
    event AfterRevert(uint256 value);
    
    function setValue(uint256 newValue) public {
        uint256 oldValue = value;
        value = newValue;
        emit ValueSet(oldValue, newValue);
    }
    
    function setValueAndRevert(uint256 newValue) public {
        uint256 oldValue = value;
        value = newValue;
        emit BeforeRevert(newValue);
        revert("Transaction reverted");
        emit AfterRevert(newValue); // 这个事件永远不会被触发
    }
    
    function conditionalRevert(uint256 newValue, bool shouldRevert) public {
        uint256 oldValue = value;
        value = newValue;
        emit ValueSet(oldValue, newValue);
        
        if (shouldRevert) {
            revert("Conditional revert");
        }
    }
} 