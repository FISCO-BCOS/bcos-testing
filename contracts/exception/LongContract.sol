// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract LongContract {
    // 存储相关变量
    uint256[] public largeArray;
    string public largeString;
    mapping(uint256 => bytes32) public largeMapping;
    mapping(uint256 => string) public longStrings;
    
    // 常量定义
    uint256 public constant MAX_STRING_LENGTH = 1024 * 1024; // 1MB
    uint256 public constant MAX_ARRAY_LENGTH = 1000000;
    uint256 public constant BATCH_SIZE = 5000;
    
    // 事件定义
    event StringStored(uint256 length);
    event ArrayGrew(uint256 newLength);
    event BatchProcessed(uint256 startIndex, uint256 count);
    event GasUsed(uint256 gasAmount);
    
    // 结构体定义
    struct LargeStruct {
        uint256[] numbers;
        string text;
        bytes32[] hashes;
    }
    
    LargeStruct[] public largeStructs;
    
    // 1. 数组大小测试
    function pushArrayElements(uint256 count) public {
        uint256 startGas = gasleft();
        
        for(uint256 i = 0; i < count; i++) {
            largeArray.push(i);
            if (i % BATCH_SIZE == 0) {
                emit ArrayGrew(largeArray.length);
            }
        }
        
        emit GasUsed(startGas - gasleft());
    }
    
    // 2. 字符串长度测试
    function setLongString(string memory _str) public {
        uint256 startGas = gasleft();
        
        largeString = _str;
        emit StringStored(bytes(_str).length);
        
        emit GasUsed(startGas - gasleft());
    }
    
    // 3. 映射存储测试
    function fillMapping(uint256 count) public {
        uint256 startGas = gasleft();
        
        for(uint256 i = 0; i < count; i++) {
            largeMapping[i] = keccak256(abi.encodePacked(i));
            if (i % BATCH_SIZE == 0) {
                emit BatchProcessed(i, BATCH_SIZE);
            }
        }
        
        emit GasUsed(startGas - gasleft());
    }
    
    // 4. 结构体数组测试
    function pushLargeStruct(
        uint256[] memory numbers,
        string memory text,
        bytes32[] memory hashes
    ) public {
        uint256 startGas = gasleft();
        
        LargeStruct storage newStruct = largeStructs.push();
        for(uint256 i = 0; i < numbers.length; i++) {
            newStruct.numbers.push(numbers[i]);
        }
        newStruct.text = text;
        for(uint256 i = 0; i < hashes.length; i++) {
            newStruct.hashes.push(hashes[i]);
        }
        
        emit GasUsed(startGas - gasleft());
    }
    
    // 5. 生成大字符串
    function generateLongString(uint256 length) public pure returns (string memory) {
        bytes memory result = new bytes(length);
        for(uint256 i = 0; i < length; i++) {
            result[i] = bytes1(uint8(65 + (i % 26))); // A-Z循环
        }
        return string(result);
    }
    
    // 6. 内存分配测试
    function allocateMemory(uint256 size) public pure returns (bytes memory) {
        return new bytes(size);
    }
    
    // 7. 获取数组长度
    function getArrayLength() public view returns (uint256) {
        return largeArray.length;
    }
    
    // 8. 获取结构体数组长度
    function getStructArrayLength() public view returns (uint256) {
        return largeStructs.length;
    }
    
    // 9. 清理数据
    function clear() public {
        delete largeArray;
        delete largeString;
        delete largeStructs;
    }
} 