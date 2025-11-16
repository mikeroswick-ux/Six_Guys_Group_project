// API配置文件
require('dotenv').config();

module.exports = {
  // 服务器配置
  port: process.env.PORT || 3001,
  
  // 区块链网络配置
  network: {
    // 本地开发网络
    localhost: {
      url: process.env.RPC_URL || 'http://127.0.0.1:8545',
      chainId: 31337,
    },
    // 测试网络配置示例（可根据需要添加）
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || '',
      chainId: 11155111,
    }
  },
  
  // 合约地址（部署后需要更新）
  contracts: {
    // 这些地址会在部署后自动更新，或手动配置
    DEX: process.env.DEX_ADDRESS || '',
    Token0: process.env.TOKEN0_ADDRESS || '',
    Token1: process.env.TOKEN1_ADDRESS || '',
    LPToken: process.env.LP_TOKEN_ADDRESS || '',
  },
  
  // CORS配置
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  }
};

