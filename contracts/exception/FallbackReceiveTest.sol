// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title FallbackReceiveTest
 * @dev 测试合约的 fallback、receive、staticcall 和 payable 功能
 */
contract FallbackReceiveTest {
    // 状态变量
    uint256 public lastValueReceived;
    string public lastFunctionCalled;
    address public lastCaller;
    bytes public lastData;
    uint256 public totalReceived;
    
    // 事件
    event Received(address sender, uint256 amount, string method);
    event FallbackCalled(address sender, bytes data);
    event FunctionCalled(string name, address caller);
    
    // 构造函数
    constructor() payable {
        if (msg.value > 0) {
            lastValueReceived = msg.value;
            totalReceived += msg.value;
            emit Received(msg.sender, msg.value, "constructor");
        }
    }
    
    // receive 函数 - 处理纯ETH转账
    receive() external payable {
        lastValueReceived = msg.value;
        lastFunctionCalled = "receive";
        lastCaller = msg.sender;
        totalReceived += msg.value;
        
        emit Received(msg.sender, msg.value, "receive");
    }
    
    // fallback 函数 - 处理未知函数调用
    fallback() external payable {
        lastValueReceived = msg.value;
        lastFunctionCalled = "fallback";
        lastCaller = msg.sender;
        lastData = msg.data;
        totalReceived += msg.value;
        
        emit FallbackCalled(msg.sender, msg.data);
    }
    
    // 标准 payable 函数
    function deposit() external payable {
        require(msg.value > 0, "Must send ETH");
        lastValueReceived = msg.value;
        lastFunctionCalled = "deposit";
        lastCaller = msg.sender;
        totalReceived += msg.value;
        
        emit Received(msg.sender, msg.value, "deposit");
    }
    
    // 可以通过 staticcall 调用的 view 函数
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    // 不可通过 staticcall 调用的非 view 函数
    function updateState(string memory functionName) external {
        lastFunctionCalled = functionName;
        lastCaller = msg.sender;
        
        emit FunctionCalled(functionName, msg.sender);
    }
    
    // 测试 staticcall 的函数 - 修复了实现方式
    function testStaticCall(address target, bytes calldata data) external view returns (bool success, bytes memory returnData) {
        // 使用低级调用执行 staticcall
        (success, returnData) = target.staticcall(data);
    }
    
    // 提取合约余额
    function withdraw() external {
        require(address(this).balance > 0, "No balance to withdraw");
        lastFunctionCalled = "withdraw";
        lastCaller = msg.sender;
        
        uint256 amount = address(this).balance;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Withdrawal failed");
        
        emit Received(msg.sender, amount, "withdraw");
    }
    
    // 获取合约信息
    function getContractInfo() external view returns (
        uint256 _lastValueReceived,
        string memory _lastFunctionCalled,
        address _lastCaller,
        bytes memory _lastData,
        uint256 _totalReceived,
        uint256 _balance
    ) {
        return (
            lastValueReceived,
            lastFunctionCalled,
            lastCaller,
            lastData,
            totalReceived,
            address(this).balance
        );
    }
} 