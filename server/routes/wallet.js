// 钱包相关路由
const express = require('express');
const router = express.Router();
const { getProvider } = require('../utils/contracts');
const config = require('../config');
const { ethers } = require('ethers');

/**
 * GET /api/wallet/connect
 * 验证钱包连接（前端直接连接，这里提供网络信息）
 */
router.get('/connect', async (req, res) => {
  try {
    const network = config.network.localhost;
    res.json({
      success: true,
      data: {
        chainId: network.chainId,
        rpcUrl: network.url,
        contracts: config.contracts,
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/wallet/balance/:address
 * 查询钱包ETH余额
 */
router.get('/balance/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const provider = getProvider();
    const balance = await provider.getBalance(address);
    
    res.json({
      success: true,
      data: {
        address,
        balance: balance.toString(),
        balanceFormatted: ethers.formatEther(balance),
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

