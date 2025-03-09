// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract DivisionByZero {
    uint256 public result;
    
    event Division(uint256 numerator, uint256 denominator, uint256 result);
    
    function divide(uint256 numerator, uint256 denominator) public {
        result = numerator / denominator; // 当 denominator 为 0 时会抛出异常
        emit Division(numerator, denominator, result);
    }
    
    function divideWithCheck(uint256 numerator, uint256 denominator) public returns (uint256) {
        require(denominator != 0, "Denominator cannot be zero");
        result = numerator / denominator;
        emit Division(numerator, denominator, result);
        return result;
    }
} 