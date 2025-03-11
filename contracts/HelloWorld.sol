// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract HelloWorld {
    string private message;

    // 构造函数，设置初始消息
    constructor() {
        message = "Hello World";
    }

    // 设置消息的方法
    function set(string memory _message) public {
        message = _message;
    }

    // 获取消息的方法
    function get() public view returns (string memory) {
        return message;
    }
} 