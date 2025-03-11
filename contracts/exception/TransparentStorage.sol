// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

// 存储槽位管理合约
contract StorageSlot {
    // 使用特定的存储槽位存储实现合约地址
    bytes32 private constant IMPLEMENTATION_SLOT = bytes32(uint256(
        keccak256("eip1967.proxy.implementation")) - 1
    );
    
    // 存储槽位结构
    struct AddressSlot {
        address value;
    }
    
    // 获取实现合约地址
    function getImplementation() public view returns (address) {
        return getAddressSlot(IMPLEMENTATION_SLOT).value;
    }
    
    // 设置实现合约地址
    function setImplementation(address newImplementation) public {
        require(newImplementation != address(0), "Invalid implementation address");
        getAddressSlot(IMPLEMENTATION_SLOT).value = newImplementation;
    }
    
    // 通过汇编获取存储槽位
    function getAddressSlot(bytes32 slot) internal pure returns (AddressSlot storage r) {
        assembly {
            r.slot := slot
        }
    }
}

// 代理合约
contract TransparentProxy is StorageSlot {
    event Upgraded(address indexed implementation);
    
    constructor(address _implementation) {
        setImplementation(_implementation);
    }
    
    // 回退函数，处理所有调用
    fallback() external payable {
        _delegate(getImplementation());
    }
    
    // 接收ETH的函数
    receive() external payable {
        _delegate(getImplementation());
    }
    
    // 委托调用到实现合约
    function _delegate(address implementation) internal {
        assembly {
            // 复制调用数据
            calldatacopy(0, 0, calldatasize())
            
            // 执行委托调用
            let result := delegatecall(gas(), implementation, 0, calldatasize(), 0, 0)
            
            // 复制返回数据
            returndatacopy(0, 0, returndatasize())
            
            // 处理调用结果
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
}

// 版本1实现合约
contract LogicV1 {
    uint256 public value;
    
    event ValueChanged(uint256 newValue);
    
    function setValue(uint256 newValue) public {
        value = newValue;
        emit ValueChanged(newValue);
    }
}

// 版本2实现合约（增加了新功能）
contract LogicV2 {
    uint256 public value;
    string public version;
    
    event ValueChanged(uint256 newValue);
    event VersionChanged(string newVersion);
    
    function setValue(uint256 newValue) public {
        value = newValue;
        emit ValueChanged(newValue);
    }
    
    function setVersion(string memory newVersion) public {
        version = newVersion;
        emit VersionChanged(newVersion);
    }
} 