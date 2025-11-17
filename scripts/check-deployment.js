// 检查部署状态和合约地址
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

async function main() {
  console.log("🔍 检查部署状态...\n");

  // 检查 .env 文件
  const envPath = path.join(__dirname, "..", ".env");
  const envExists = fs.existsSync(envPath);

  console.log("1. 检查 .env 文件:");
  if (envExists) {
    console.log("   ✅ .env 文件存在");
    const envContent = fs.readFileSync(envPath, "utf8");
    const dexAddress = process.env.DEX_ADDRESS;
    const token0Address = process.env.TOKEN0_ADDRESS;
    const token1Address = process.env.TOKEN1_ADDRESS;

    console.log(`   DEX_ADDRESS: ${dexAddress || "未设置"}`);
    console.log(`   TOKEN0_ADDRESS: ${token0Address || "未设置"}`);
    console.log(`   TOKEN1_ADDRESS: ${token1Address || "未设置"}`);
  } else {
    console.log("   ❌ .env 文件不存在");
    console.log("   💡 运行 'npm run deploy' 来部署合约并生成 .env 文件");
  }

  // 检查 RPC 连接
  console.log("\n2. 检查 RPC 连接:");
  try {
    const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    const blockNumber = await provider.getBlockNumber();
    console.log(`   ✅ 连接到 http://127.0.0.1:8545`);
    console.log(`   当前区块号: ${blockNumber}`);
  } catch (error) {
    console.log("   ❌ 无法连接到 RPC 节点");
    console.log(`   错误: ${error.message}`);
    console.log("   💡 请确保 Hardhat 节点正在运行: npx hardhat node");
  }

  // 检查合约是否可访问
  if (process.env.DEX_ADDRESS) {
    console.log("\n3. 检查 DEX 合约:");
    try {
      const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
      const code = await provider.getCode(process.env.DEX_ADDRESS);
      
      if (code === "0x") {
        console.log("   ❌ 合约地址上没有代码");
        console.log("   💡 合约可能未部署，或地址不正确");
      } else {
        console.log("   ✅ 合约代码存在");
        
        // 尝试读取合约信息
        try {
          const DEX_ABI = require("../artifacts/contracts/DEX.sol/DEX.json").abi;
          const dex = new ethers.Contract(process.env.DEX_ADDRESS, DEX_ABI, provider);
          const token0 = await dex.token0();
          const token1 = await dex.token1();
          console.log(`   Token0: ${token0}`);
          console.log(`   Token1: ${token1}`);
        } catch (error) {
          console.log(`   ⚠️  无法读取合约信息: ${error.message}`);
        }
      }
    } catch (error) {
      console.log(`   ❌ 检查合约时出错: ${error.message}`);
    }
  } else {
    console.log("\n3. 检查 DEX 合约:");
    console.log("   ⚠️  DEX_ADDRESS 未设置，跳过检查");
  }

  // 建议
  console.log("\n📋 建议:");
  if (!envExists) {
    console.log("   1. 运行 'npm run deploy' 部署合约");
  } else if (!process.env.DEX_ADDRESS) {
    console.log("   1. 检查 .env 文件中的 DEX_ADDRESS 是否正确");
    console.log("   2. 如果地址不正确，重新运行 'npm run deploy'");
  } else {
    console.log("   1. 确保后端服务器已重启以加载新的 .env 配置");
    console.log("   2. 如果问题仍然存在，检查 RPC 连接和网络配置");
  }
}

main().catch((error) => {
  console.error("❌ 检查过程中出错:", error);
  process.exit(1);
});

