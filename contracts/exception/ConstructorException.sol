// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract ConstructorException {
    uint256 public immutable minimumValue;
    address public immutable owner;
    string public name;
    
    error InvalidMinimumValue(uint256 value);
    error InvalidOwnerAddress();
    error InvalidNameLength(uint256 length);
    
    constructor(uint256 _minimumValue, address _owner, string memory _name) {
        if (_minimumValue == 0) {
            revert InvalidMinimumValue(_minimumValue);
        }
        if (_owner == address(0)) {
            revert InvalidOwnerAddress();
        }
        if (bytes(_name).length == 0 || bytes(_name).length > 32) {
            revert InvalidNameLength(bytes(_name).length);
        }
        
        minimumValue = _minimumValue;
        owner = _owner;
        name = _name;
    }
} 