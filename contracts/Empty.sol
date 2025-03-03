// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Empty {
    constructor() {}

    // 获取消息的方法
    function get() public view returns (string memory) {
        return "Empty Contract";
    }
}
