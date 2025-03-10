require("hardhat/config");

task("test:list", "Lists all test cases")
  .setAction(async (taskArgs, hre) => {

    console.log("taskArgs", taskArgs);
    // console.log("hre", hre);

    const fs = require('fs');
    const path = require('path');

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

    // 设置路径
    const testDirName = taskArgs.testDir || '../test';
    const testDir = path.join(__dirname, testDirName);
    const testFiles = fs.readdirSync(testDir)
      .filter(file => file.endsWith('.js'));

    console.log('Available Test Cases:');
    testFiles.forEach(file => {
      console.log("\n")
      console.log("==================================================");
      console.log(`\nFile: ${file}`);
      const filePath = path.join(testDir, file);
      const testCases = extractTestCases(filePath);
      testCases.forEach(testCase => console.log(testCase));
    });
  });


