require("hardhat/config");
const fs = require('fs');
const path = require('path');

task("test:list", "Lists all test cases")
  .addOptionalParam("testDir", "Directory containing test files", "./test")
  .setAction(async (taskArgs, hre) => {
    console.log("参数 taskArgs", taskArgs);

    function extractTestCases(filePath) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const testCases = [];

      const describeRegex = /describe\s*\(\s*['"]([^'"]+)['"]/g;
      const itRegex = /it\s*\(\s*['"]([^'"]+)['"]/g;

      let describeMatch;
      while ((describeMatch = describeRegex.exec(content)) !== null) {
        testCases.push(`Suite: ${describeMatch[1]}`);

        // 在当前 describe 块中查找 it  
        const suiteContent = content.slice(describeMatch.index);
        const localItRegex = /it\s*\(\s*['"]([^'"]+)['"]/g;
        let itMatch;
        while ((itMatch = localItRegex.exec(suiteContent)) !== null) {
          testCases.push(`  -- ${itMatch[1]}`);
        }
      }

      return testCases;
    }

    // 递归遍历目录查找测试文件  
    function findTestFiles(dir) {
      const testFiles = [];

      function traverseDirectory(currentPath) {
        const files = fs.readdirSync(currentPath);

        files.forEach(file => {
          const fullPath = path.join(currentPath, file);
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory()) {
            // 递归遍历子目录  
            traverseDirectory(fullPath);
          } else if (file.endsWith('.js') || file.endsWith('.ts')) {
            // 仅添加 .js 和 .ts 测试文件  
            testFiles.push(fullPath);
          }
        });
      }

      traverseDirectory(dir);
      return testFiles;
    }

    // 设置路径  
    const testDirName = taskArgs.testDir || '../../test';
    // const testDir = path.resolve(__dirname, testDirName);
    const testDir = path.resolve(__dirname, '../..', testDirName);

    console.log('Test Directory:', testDir);
    console.log('Available Test Cases:');

    // 查找所有测试文件  
    const testFiles = findTestFiles(testDir);

    testFiles.forEach(filePath => {
      // 计算相对路径  
      const relativePath = path.relative(testDir, filePath);

      console.log("\n==================================================");
      console.log(`\nFile: ${relativePath}`);

      try {
        const testCases = extractTestCases(filePath);
        testCases.forEach(testCase => console.log(testCase));
      } catch (error) {
        console.error(`Error parsing ${relativePath}:`, error.message);
      }
    });

    console.log(`\nTotal Test Files Found: ${testFiles.length}`);
  });  