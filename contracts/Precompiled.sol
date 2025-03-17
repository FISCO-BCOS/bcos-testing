// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title Precompiled
 * @dev 测试以太坊预编译合约(0x01-0x0a)
 */
contract Precompiled {
    // 测试结果事件
    event TestResult(string name, bool success, bytes result);
    
    // 1. ECRECOVER (0x01) - 从签名中恢复地址
    function testEcrecover(bytes32 hash, uint8 v, bytes32 r, bytes32 s) public pure returns (address) {
        address result = ecrecover(hash, v, r, s);
        return result;
    }
    
    // 2. SHA256 (0x02) - 计算SHA-256哈希
    function testSha256(bytes memory data) public pure returns (bytes32) {
        bytes32 result = sha256(data);
        return result;
    }
    
    // 3. RIPEMD160 (0x03) - 计算RIPEMD-160哈希
    function testRipemd160(bytes memory data) public pure returns (bytes20) {
        bytes20 result = ripemd160(data);
        return result;
    }
    
    // 4. IDENTITY (0x04) - 数据复制
    function testIdentity(bytes memory data) public view returns (bytes memory) {
        bytes memory result;
        
        // 使用汇编调用identity预编译合约
        assembly {
            // 获取data的长度和指针
            let len := mload(data)
            let dataPtr := add(data, 0x20)
            
            // 分配内存空间存储结果
            result := mload(0x40)
            mstore(0x40, add(result, add(0x20, len)))
            mstore(result, len)
            
            // 调用identity预编译合约(0x04)
            let success := staticcall(gas(), 0x04, dataPtr, len, add(result, 0x20), len)
            
            // 检查调用是否成功
            if iszero(success) {
                revert(0, 0)
            }
        }
        
        return result;
    }
    
    // 5. MODEXP (0x05) - 模幂运算
    function testModexp(uint256 base, uint256 exponent, uint256 modulus) public view returns (uint256) {
        // 将参数转换为字节数组
        bytes memory baseBytes = toBytes(base);
        bytes memory exponentBytes = toBytes(exponent);
        bytes memory modulusBytes = toBytes(modulus);
        
        uint256 baseLen = baseBytes.length;
        uint256 expLen = exponentBytes.length;
        uint256 modLen = modulusBytes.length;
        
        // 准备输入数据
        bytes memory input = new bytes(96 + baseLen + expLen + modLen);
        
        // 填充长度字段 (前96字节)
        assembly {
            // 存储baseLen (32字节)
            mstore(add(input, 32), baseLen)
            // 存储expLen (32字节)
            mstore(add(input, 64), expLen)
            // 存储modLen (32字节)
            mstore(add(input, 96), modLen)
        }
        
        // 复制参数数据
        for (uint256 i = 0; i < baseLen; i++) {
            input[96 + i] = baseBytes[i];
        }
        
        for (uint256 i = 0; i < expLen; i++) {
            input[96 + baseLen + i] = exponentBytes[i];
        }
        
        for (uint256 i = 0; i < modLen; i++) {
            input[96 + baseLen + expLen + i] = modulusBytes[i];
        }
        
        // 准备输出缓冲区
        bytes memory output = new bytes(modLen);
        
        // 调用预编译合约
        bool success;
        assembly {
            success := staticcall(
                gas(),
                0x05,                // MODEXP预编译合约地址
                add(input, 32),      // 输入数据指针 (跳过长度字段)
                mload(input),        // 输入数据长度
                add(output, 32),     // 输出数据指针 (跳过长度字段)
                modLen               // 输出数据长度
            )
        }
        
        require(success, "MODEXP call failed");
        
        // 将输出转换为uint256
        return bytesToUint(output);
    }
    
    // 辅助函数: 将uint256转换为字节数组
    function toBytes(uint256 x) internal pure returns (bytes memory) {
        if (x == 0) {
            bytes memory b = new bytes(1);
            b[0] = 0;
            return b;
        }
        
        uint256 j = 0;
        uint256 temp = x;
        while (temp != 0) {
            j++;
            temp >>= 8;
        }
        
        bytes memory b = new bytes(j);
        
        for (uint256 i = 0; i < j; i++) {
            b[j - i - 1] = bytes1(uint8(x & 0xFF));
            x >>= 8;
        }
        
        return b;
    }
    
    // 辅助函数: 将字节数组转换为uint256
    function bytesToUint(bytes memory b) internal pure returns (uint256) {
        uint256 result = 0;
        
        for (uint256 i = 0; i < b.length; i++) {
            result = result * 256 + uint8(b[i]);
        }
        
        return result;
    }
    
    // 6. ECADD (0x06) - 椭圆曲线加法
    function testEcadd(uint256[2] memory p1, uint256[2] memory p2) public view returns (uint256[2] memory) {
        uint256[2] memory result;
        
        assembly {
            // 分配内存空间存储输入数据
            let inputData := mload(0x40)
            mstore(0x40, add(inputData, 0x80))
            
            // 存储P1
            mstore(inputData, mload(p1))
            mstore(add(inputData, 0x20), mload(add(p1, 0x20)))
            
            // 存储P2
            mstore(add(inputData, 0x40), mload(p2))
            mstore(add(inputData, 0x60), mload(add(p2, 0x20)))
            
            // 调用ECADD预编译合约(0x06)
            let success := staticcall(gas(), 0x06, inputData, 0x80, result, 0x40)
            
            // 检查调用是否成功
            if iszero(success) {
                revert(0, 0)
            }
        }
        
        return result;
    }
    
    // 7. ECMUL (0x07) - 椭圆曲线乘法
    function testEcmul(uint256[2] memory p, uint256 scalar) public view returns (uint256[2] memory) {
        uint256[2] memory result;
        
        assembly {
            // 分配内存空间存储输入数据
            let inputData := mload(0x40)
            mstore(0x40, add(inputData, 0x60))
            
            // 存储点P
            mstore(inputData, mload(p))
            mstore(add(inputData, 0x20), mload(add(p, 0x20)))
            
            // 存储标量
            mstore(add(inputData, 0x40), scalar)
            
            // 调用ECMUL预编译合约(0x07)
            let success := staticcall(gas(), 0x07, inputData, 0x60, result, 0x40)
            
            // 检查调用是否成功
            if iszero(success) {
                revert(0, 0)
            }
        }
        
        return result;
    }
    
    // 8. ECPAIRING (0x08) - 椭圆曲线配对检查
    function testEcpairing(bytes memory input) public view returns (bool) {
        bool result;
        
        assembly {
            // 获取输入数据的长度
            let inputLen := mload(input)
            let inputPtr := add(input, 0x20)
            
            // 分配内存空间存储结果
            let outputPtr := mload(0x40)
            mstore(0x40, add(outputPtr, 0x20))
            
            // 调用ECPAIRING预编译合约(0x08)
            let success := staticcall(gas(), 0x08, inputPtr, inputLen, outputPtr, 0x20)
            
            // 检查调用是否成功
            if iszero(success) {
                revert(0, 0)
            }
            
            // 读取结果
            result := mload(outputPtr)
        }
        
        return result;
    }
    
    // 9. BLAKE2F (0x09) - BLAKE2压缩函数
    function testBlake2f(uint32 rounds, bytes32[2] memory h, bytes32[4] memory m, bytes8[2] memory t, bool f) public view returns (bytes32[2] memory) {
        bytes32[2] memory result;
        
        assembly {
            // 分配内存空间存储输入数据
            let inputData := mload(0x40)
            
            // 存储rounds (4字节)
            mstore(inputData, rounds)
            
            // 存储h (64字节)
            mstore(add(inputData, 0x04), mload(h))
            mstore(add(inputData, 0x24), mload(add(h, 0x20)))
            
            // 存储m (128字节)
            mstore(add(inputData, 0x44), mload(m))
            mstore(add(inputData, 0x64), mload(add(m, 0x20)))
            mstore(add(inputData, 0x84), mload(add(m, 0x40)))
            mstore(add(inputData, 0xA4), mload(add(m, 0x60)))
            
            // 存储t (16字节)
            mstore8(add(inputData, 0xC4), mload(t))
            mstore8(add(inputData, 0xCC), mload(add(t, 0x08)))
            
            // 存储f (1字节)
            switch f
            case 0 {
                mstore8(add(inputData, 0xD4), 0)
            }
            default {
                mstore8(add(inputData, 0xD4), 1)
            }
            
            // 更新内存指针
            mstore(0x40, add(inputData, 0xD5))
            
            // 调用BLAKE2F预编译合约(0x09)
            let success := staticcall(gas(), 0x09, inputData, 0xD5, result, 0x40)
            
            // 检查调用是否成功
            if iszero(success) {
                revert(0, 0)
            }
        }
        
        return result;
    }
    
    // 10. POINT_EVALUATION (0x0a) - KZG点评估证明验证
    function testPointEvaluation(
        bytes32 commitment,
        bytes32 z,
        bytes32 y,
        bytes calldata proof
    ) public view returns (bool) {
        bool result;
        
        assembly {
            // 分配内存空间存储输入数据
            let inputData := mload(0x40)
            
            // 存储commitment (32字节)
            mstore(inputData, commitment)
            
            // 存储z (32字节)
            mstore(add(inputData, 0x20), z)
            
            // 存储y (32字节)
            mstore(add(inputData, 0x40), y)
            
            // 计算proof的偏移量和长度
            let proofOffset := proof.offset
            let proofLength := proof.length
            
            // 复制proof数据
            calldatacopy(add(inputData, 0x60), proofOffset, proofLength)
            
            // 更新内存指针
            mstore(0x40, add(add(inputData, 0x60), proofLength))
            
            // 计算输入数据的总长度
            let inputSize := add(0x60, proofLength)
            
            // 分配内存空间存储结果
            let outputPtr := mload(0x40)
            mstore(0x40, add(outputPtr, 0x20))
            
            // 调用POINT_EVALUATION预编译合约(0x0a)
            let success := staticcall(gas(), 0x0a, inputData, inputSize, outputPtr, 0x20)
            
            // 检查调用是否成功
            if iszero(success) {
                revert(0, 0)
            }
            
            // 读取结果
            result := mload(outputPtr)
        }
        
        return result;
    }
    
    // 辅助函数：生成签名测试数据
    function getSignatureTestData() public pure returns (bytes32 hash, uint8 v, bytes32 r, bytes32 s, address signer) {
        // 使用一个已知的、经过验证的签名示例
        hash = 0xdecafcafebeefcafebeefcafebeefcafebeefcafebeefcafebeefcafebeefcaf;
        v = 27;
        r = 0x9242685bf161793cc25603c231bc2f568eb630ea16aa137d2664ac8038825608;
        s = 0x4f8ae3bd7535248d0bd448298cc2e2071e56992d0774dc340c368ae950852ada;
        signer = 0x5ce9454909639D2D17A3F753ce7d93fa0b9aB12E;
    }
    
    // 辅助函数：生成椭圆曲线测试点
    function getEcTestPoints() public pure returns (uint256[2] memory p1, uint256[2] memory p2) {
        // alt_bn128曲线上的点
        p1[0] = 1;
        p1[1] = 2;
        
        p2[0] = 1;
        p2[1] = 2;
    }
    
    // 辅助函数：生成配对测试数据
    function getEcPairingTestData() public pure returns (bytes memory) {
        // 简单的配对测试数据
        bytes memory input = new bytes(192);
        
        // 设置一些测试值
        assembly {
            // 第一个点对
            mstore(add(input, 0x20), 1) // G1.x
            mstore(add(input, 0x40), 2) // G1.y
            mstore(add(input, 0x60), 1) // G2.x[0]
            mstore(add(input, 0x80), 0) // G2.x[1]
            mstore(add(input, 0xA0), 2) // G2.y[0]
            mstore(add(input, 0xC0), 0) // G2.y[1]
        }
        
        return input;
    }
} 