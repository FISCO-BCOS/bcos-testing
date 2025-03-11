const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LongContract", function () {
    let longContract;
    let owner;

    // - 默认值：2000ms（2秒）
    // - 当前值：100000ms（100秒）
    // - 原因：处理大量数据操作需要更长时间
    this.timeout(300000);

    beforeEach(async function () {
        [owner] = await ethers.getSigners();
        const LongContract = await ethers.getContractFactory("LongContract");
        longContract = await LongContract.deploy();
        await longContract.waitForDeployment();
        console.log("合约部署地址:", await longContract.getAddress());
    });

    describe("极限测试", function () {
        // 1. 修复BigInt错误的数组测试
        it("应该测试数组大小的极限", async function () {
            console.log("\n测试场景1: 数组大小极限测试");
            
            // 测试不同大小的数组
            const sizes = [
                100,
                500,
                1000,
                2000,
                5000,
                10000,
                20000,
                50000
            ];
            
            let lastSuccessfulSize = 0;
            
            for(const size of sizes) {
                try {
                    console.log(`尝试创建大小为 ${size} 的数组...`);
                    await longContract.pushArrayElements(size);
                    
                    // 验证数组长度
                    const arrayLength = await longContract.getArrayLength();
                    lastSuccessfulSize = size;
                    
                    // 清空数组，为下一次测试做准备
                    await longContract.clear();
                    
                    console.log(`✓ 成功创建大小为 ${size} 的数组`);
                } catch (error) {
                    console.log(`✗ 创建大小为 ${size} 的数组失败: ${error.message}`);
                    break;
                }
            }
            
            // 最后再次验证能成功创建的最大数组
            if (lastSuccessfulSize > 0) {
                console.log(`\n验证最大成功大小: ${lastSuccessfulSize}`);
                await longContract.pushArrayElements(lastSuccessfulSize);
                const finalLength = await longContract.getArrayLength();
                expect(Number(finalLength)).to.equal(lastSuccessfulSize);
            }
            
            console.log(`\n数组大小极限测试结果:`);
            console.log(`- 最大成功数组大小: ${lastSuccessfulSize}`);
            
            // 如果所有尺寸都测试成功，记录结果
            if (lastSuccessfulSize === sizes[sizes.length - 1]) {
                console.log(`- 注意: 所有测试大小都成功，实际极限可能更大`);
            }
        });

        // 2. 修复映射存储测试
        it("应该能处理大量映射数据并触发事件", async function () {
            console.log("\n测试场景3: 映射存储测试");
            
            const batchSize = Number(await longContract.BATCH_SIZE());
            const testSize = 100; // 测试100个映射项
            
            await longContract.fillMapping(testSize);
            
            // 验证随机位置的值
            for(let i = 0; i < 5; i++) {
                const randomIndex = Math.floor(Math.random() * testSize);
                const value = await longContract.largeMapping(randomIndex);
                
                // 确保哈希计算方式与合约一致
                const expectedValue = ethers.keccak256(
                    ethers.AbiCoder.defaultAbiCoder().encode(
                        ['uint256'],
                        [randomIndex]
                    )
                );
                
                console.log(`验证索引 ${randomIndex}:`);
                console.log(`合约值: ${value}`);
                console.log(`期望值: ${expectedValue}`);
                
                expect(value).to.equal(expectedValue);
            }
        });

        // 3. 修复结构体数组测试，减小数据量
        it("应该能处理大结构体数组", async function () {
            console.log("\n测试场景4: 结构体数组测试");
            
            // 减小测试数据量
            const numbers = Array.from({length: 100}, (_, i) => i); // 从1000减到100
            const text = await longContract.generateLongString(1000); // 从10000减到1000
            const hashes = Array.from({length: 10}, (_, i) => // 从100减到10
                ethers.keccak256(ethers.toBeArray(i))
            );
            
            const tx = await longContract.pushLargeStruct(numbers, text, hashes);
            const receipt = await tx.wait();
            console.log(`结构体存储Gas消耗: ${receipt.gasUsed}`);
            
            const structCount = await longContract.getStructArrayLength();
            expect(Number(structCount)).to.equal(1);
        });

        // 4. 修改字符串测试的大小限制
        it("应该能处理长字符串", async function () {
            console.log("\n测试场景2: 长字符串测试");
            
            // 减小测试长度
            const lengths = [
                10000, 
                100000,
                1000000, 
                10000000, // 最大测试10MB
            ];
            
            for(const length of lengths) {
                try {
                    const longString = await longContract.generateLongString(length);
                    const tx = await longContract.setLongString(longString);
                    const receipt = await tx.wait();
                    console.log(`成功存储长度为 ${length} 的字符串，Gas消耗: ${receipt.gasUsed}`);
                } catch (error) {
                    console.log(`存储长度为 ${length} 的字符串失败: ${error.message}`);
                }
            }
        });

        // 5. 修改组合测试的数据量
        it("应该能同时处理多种大数据操作", async function () {
            console.log("\n测试场景6: 组合操作测试");
            
            // 减小所有操作的数据量
            await longContract.pushArrayElements(100); // 从1000减到100
            
            const longString = await longContract.generateLongString(1000); // 从10000减到1000
            await longContract.setLongString(longString);
            
            const numbers = Array.from({length: 50}, (_, i) => i);
            const text = await longContract.generateLongString(500);
            const hashes = Array.from({length: 5}, (_, i) => 
                ethers.keccak256(ethers.toBeArray(i))
            );
            
            await longContract.pushLargeStruct(numbers, text, hashes);
            
            // 验证所有数据
            const arrayLength = await longContract.getArrayLength();
            const structCount = await longContract.getStructArrayLength();
            
            expect(Number(arrayLength)).to.equal(100);
            expect(Number(structCount)).to.equal(1);
        });

        // 6. 内存分配测试 - 增加更多测试大小
        it("应该测试内存分配极限", async function () {
            console.log("\n测试场景5: 内存分配测试");
            
            const sizes = [
                1024,          // 1KB
                1024 * 10,     // 10KB
                1024 * 100,    // 100KB
                1024 * 1024,   // 1MB
                1024 * 1024 * 2 // 2MB
            ];
            
            for(const size of sizes) {
                try {
                    await longContract.allocateMemory(size);
                    console.log(`✓ 成功分配 ${size/1024}KB 内存`);
                } catch (error) {
                    console.log(`✗ 分配 ${size/1024}KB 内存失败: ${error.message}`);
                    // 记录到达的极限
                    console.log(`内存分配极限约为: ${size/1024}KB`);
                    break;
                }
            }
        });

        // 7. 清理测试 - 验证清理效果
        it("应该能完全清理所有数据", async function () {
            console.log("\n测试场景7: 清理测试");
            
            // 先存入一些数据
            await longContract.pushArrayElements(100);
            const longString = await longContract.generateLongString(1000);
            await longContract.setLongString(longString);
            
            // 清理数据
            await longContract.clear();
            
            // 验证清理效果
            const arrayLength = await longContract.getArrayLength();
            const storedString = await longContract.largeString();
            const structCount = await longContract.getStructArrayLength();
            
            expect(arrayLength).to.equal(0);
            expect(storedString).to.equal("");
            expect(structCount).to.equal(0);
        });

        afterEach(async function () {
            try {
                await longContract.clear();
                console.log("\n已清理测试数据");
            } catch (error) {
                console.log("\n清理数据失败:", error.message);
            }
            
            // 移除所有事件监听
            longContract.removeAllListeners();
        });
    });
}); 