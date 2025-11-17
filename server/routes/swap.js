// 代币交换相关路由
const express = require('express');
const router = express.Router();
const { getContract, getSignedContract, formatTokenAmount, parseTokenAmount } = require('../utils/contracts');
const config = require('../config');

/**
 * POST /api/swap/quote
 * 获取交换报价（不执行交易）
 */
router.post('/quote', async (req, res) => {
  try {
    const { tokenIn, amountIn, userAddress } = req.body;
    
    if (!tokenIn || !amountIn) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: tokenIn, amountIn'
      });
    }
    
    const dexAddress = config.contracts.DEX;
    if (!dexAddress) {
      return res.status(500).json({
        success: false,
        error: 'DEX contract address not configured'
      });
    }
    
    const dex = getContract('DEX', dexAddress);
    const amountInWei = parseTokenAmount(amountIn);
    const amountOut = await dex.getAmountOut(amountInWei, tokenIn);
    
    // 获取价格信息
    const [reserve0, reserve1] = await Promise.all([
      dex.reserve0(),
      dex.reserve1()
    ]);
    
    const token0Address = await dex.token0();
    const token1Address = await dex.token1();
    
    res.json({
      success: true,
      data: {
        tokenIn,
        amountIn,
        amountOut: formatTokenAmount(amountOut),
        amountOutWei: amountOut.toString(),
        reserves: {
          token0: {
            address: token0Address,
            reserve: formatTokenAmount(reserve0),
          },
          token1: {
            address: token1Address,
            reserve: formatTokenAmount(reserve1),
          }
        }
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
 * POST /api/swap/execute
 * 执行代币交换（需要前端签名）
 * 注意：实际交易需要用户在前端签名，这里只返回交易数据
 */
router.post('/execute', async (req, res) => {
  try {
    const { tokenIn, amountIn, minAmountOut, to, userAddress } = req.body;
    
    if (!tokenIn || !amountIn || !to || !userAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: tokenIn, amountIn, to, userAddress'
      });
    }
    
    const dexAddress = config.contracts.DEX;
    if (!dexAddress) {
      return res.status(500).json({
        success: false,
        error: 'DEX contract address not configured'
      });
    }
    
    const dex = getContract('DEX', dexAddress);
    const amountInWei = parseTokenAmount(amountIn);
    const minAmountOutWei = minAmountOut ? parseTokenAmount(minAmountOut) : 0n;
    
    // 检查用户是否有足够的代币余额
    const tokenContract = getContract('ERC20', tokenIn);
    const balance = await tokenContract.balanceOf(userAddress);
    const internalBalance = await dex.balances(userAddress, tokenIn);
    
    if (balance < amountInWei && internalBalance < amountInWei) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
        data: {
          walletBalance: formatTokenAmount(balance),
          internalBalance: formatTokenAmount(internalBalance),
          required: amountIn,
        }
      });
    }
    
    // 检查授权（如果需要从钱包转账）
    if (balance >= amountInWei) {
      const allowance = await tokenContract.allowance(userAddress, dexAddress);
      if (allowance < amountInWei) {
        return res.json({
          success: true,
          requiresApproval: true,
          data: {
            token: tokenIn,
            amount: amountIn,
            spender: dexAddress,
            message: 'Token approval required before swap'
          }
        });
      }
    }
    
    // 构建交易数据
    const swapTx = await dex.swapExactTokensForTokens.populateTransaction(
      tokenIn,
      amountInWei,
      minAmountOutWei,
      to
    );
    
    res.json({
      success: true,
      requiresApproval: false,
      data: {
        to: dexAddress,
        data: swapTx.data,
        value: '0',
        gasEstimate: '200000', // 估算gas
        message: 'Transaction ready to sign'
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
 * GET /api/swap/price/:baseToken
 * 获取代币价格
 */
router.get('/price/:baseToken', async (req, res) => {
  try {
    const { baseToken } = req.params;
    const dexAddress = config.contracts.DEX;
    
    if (!dexAddress) {
      return res.status(500).json({
        success: false,
        error: 'DEX contract address not configured'
      });
    }
    
    const dex = getContract('DEX', dexAddress);
    const [numerator, denominator] = await dex.getPrice(baseToken);
    const token0Address = await dex.token0();
    const token1Address = await dex.token1();
    
    const price = Number(numerator) / Number(denominator);
    
    res.json({
      success: true,
      data: {
        baseToken,
        price,
        numerator: numerator.toString(),
        denominator: denominator.toString(),
        token0: token0Address,
        token1: token1Address,
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

