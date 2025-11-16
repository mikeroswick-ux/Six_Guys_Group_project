// API服务器主文件
const express = require('express');
const cors = require('cors');
const config = require('./config');

// 导入路由
const walletRoutes = require('./routes/wallet');
const swapRoutes = require('./routes/swap');
const tradeRoutes = require('./routes/trade');
const userRoutes = require('./routes/user');
const approvalRoutes = require('./routes/approval');

const app = express();

// 中间件
app.use(cors(config.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// 根路径 - API信息
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'DEX API Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      wallet: {
        connect: 'GET /api/wallet/connect',
        balance: 'GET /api/wallet/balance/:address',
      },
      swap: {
        quote: 'POST /api/swap/quote',
        execute: 'POST /api/swap/execute',
        price: 'GET /api/swap/price/:baseToken',
      },
      trade: {
        buy: 'POST /api/trade/buy',
        sell: 'POST /api/trade/sell',
      },
      user: {
        status: 'GET /api/user/status/:address',
        tokens: 'GET /api/user/tokens/:address',
      },
      approval: {
        check: 'POST /api/approval/check',
        build: 'POST /api/approval/build',
      },
    },
    contracts: config.contracts,
    documentation: 'See API.md for detailed documentation',
  });
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'DEX API Server is running',
    timestamp: new Date().toISOString(),
    contracts: config.contracts,
  });
});

// API路由
app.use('/api/wallet', walletRoutes);
app.use('/api/swap', swapRoutes);
app.use('/api/trade', tradeRoutes);
app.use('/api/user', userRoutes);
app.use('/api/approval', approvalRoutes);

// 404处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// 启动服务器
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║           DEX API Server Started Successfully            ║
╠══════════════════════════════════════════════════════════╣
║  Server:     http://localhost:${PORT}                          ║
║  Health:     http://localhost:${PORT}/health                  ║
║  Network:    ${config.network.localhost.url.padEnd(43)}║
║  Chain ID:   ${config.network.localhost.chainId.toString().padEnd(43)}║
╠══════════════════════════════════════════════════════════╣
║  API Endpoints:                                          ║
║  • GET  /api/wallet/connect                             ║
║  • GET  /api/wallet/balance/:address                    ║
║  • POST /api/swap/quote                                 ║
║  • POST /api/swap/execute                               ║
║  • GET  /api/swap/price/:baseToken                      ║
║  • POST /api/trade/buy                                  ║
║  • POST /api/trade/sell                                 ║
║  • GET  /api/user/status/:address                       ║
║  • GET  /api/user/tokens/:address                       ║
║  • POST /api/approval/check                             ║
║  • POST /api/approval/build                             ║
╚══════════════════════════════════════════════════════════╝
  `);
  
  // 检查合约地址配置
  console.log('\n📋 Contract Configuration:');
  if (config.contracts.DEX) {
    console.log(`   ✅ DEX: ${config.contracts.DEX}`);
  } else {
    console.warn('   ❌ DEX: Not configured');
  }
  if (config.contracts.Token0) {
    console.log(`   ✅ Token0: ${config.contracts.Token0}`);
  } else {
    console.warn('   ⚠️  Token0: Not configured (will be fetched from DEX contract)');
  }
  if (config.contracts.Token1) {
    console.log(`   ✅ Token1: ${config.contracts.Token1}`);
  } else {
    console.warn('   ⚠️  Token1: Not configured (will be fetched from DEX contract)');
  }
  
  if (!config.contracts.DEX) {
    console.warn('\n⚠️  Warning: DEX contract address not configured.');
    console.warn('   Please run "npm run deploy" to deploy contracts and generate .env file.');
    console.warn('   Or run "npm run check" to diagnose deployment status.\n');
  }
});

module.exports = app;

