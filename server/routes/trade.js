// 购买/出售相关路由（本质是交换的封装）
const express = require('express');
const router = express.Router();
const { getContract, formatTokenAmount, parseTokenAmount } = require('../utils/contracts');
const config = require('../config');
const { ethers } = require('ethers');

/**
 * POST /api/trade/buy
 * 购买代币（用token0购买token1，或用token1购买token0）
 */
router.post('/buy', async (req, res) => {
  try {
    const { tokenOut, amountIn, minAmountOut, userAddress } = req.body;
    
    if (!tokenOut || !amountIn || !userAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: tokenOut, amountIn, userAddress'
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
    const token0Address = await dex.token0();
    const token1Address = await dex.token1();
    
    // 确定输入代币（tokenOut的对立面）
    const tokenIn = tokenOut.toLowerCase() === token0Address.toLowerCase() 
      ? token1Address 
      : token0Address;
    
    if (tokenIn !== token0Address && tokenIn !== token1Address) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tokenOut address'
      });
    }
    
    const amountInWei = parseTokenAmount(amountIn);
    const amountOut = await dex.getAmountOut(amountInWei, tokenIn);
    const minAmountOutWei = minAmountOut ? parseTokenAmount(minAmountOut) : (amountOut * 95n / 100n); // 默认5%滑点保护
    
    // 检查余额和授权
    const tokenContract = getContract('ERC20', tokenIn);
    const balance = await tokenContract.balanceOf(userAddress);
    const internalBalance = await dex.balances(userAddress, tokenIn);
    
    if (balance < amountInWei && internalBalance < amountInWei) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
        data: {
          token: tokenIn,
          walletBalance: formatTokenAmount(balance),
          internalBalance: formatTokenAmount(internalBalance),
          required: amountIn,
        }
      });
    }
    
    // 构建交易数据
    const swapTx = await dex.swapExactTokensForTokens.populateTransaction(
      tokenIn,
      amountInWei,
      minAmountOutWei,
      userAddress
    );
    
    res.json({
      success: true,
      data: {
        type: 'buy',
        tokenIn,
        tokenOut,
        amountIn,
        amountOut: formatTokenAmount(amountOut),
        minAmountOut: formatTokenAmount(minAmountOutWei),
        to: dexAddress,
        data: swapTx.data,
        requiresApproval: balance >= amountInWei,
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
 * POST /api/trade/sell
 * 出售代币（用token0出售得到token1，或用token1出售得到token0）
 */
router.post('/sell', async (req, res) => {
  try {
    const { tokenIn, amountIn, minAmountOut, userAddress } = req.body;
    
    if (!tokenIn || !amountIn || !userAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: tokenIn, amountIn, userAddress'
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
    const token0Address = await dex.token0();
    const token1Address = await dex.token1();
    
    // 确定输出代币（tokenIn的对立面）
    const tokenOut = tokenIn.toLowerCase() === token0Address.toLowerCase() 
      ? token1Address 
      : token0Address;
    
    if (tokenIn !== token0Address && tokenIn !== token1Address) {
      return res.status(400).json({
        success: false,
        error: 'Invalid tokenIn address'
      });
    }
    
    const amountInWei = parseTokenAmount(amountIn);
    const amountOut = await dex.getAmountOut(amountInWei, tokenIn);
    const minAmountOutWei = minAmountOut ? parseTokenAmount(minAmountOut) : (amountOut * 95n / 100n); // 默认5%滑点保护
    
    // 检查余额和授权
    const tokenContract = getContract('ERC20', tokenIn);
    const balance = await tokenContract.balanceOf(userAddress);
    const internalBalance = await dex.balances(userAddress, tokenIn);
    
    if (balance < amountInWei && internalBalance < amountInWei) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient balance',
        data: {
          token: tokenIn,
          walletBalance: formatTokenAmount(balance),
          internalBalance: formatTokenAmount(internalBalance),
          required: amountIn,
        }
      });
    }
    
    // 构建交易数据
    const swapTx = await dex.swapExactTokensForTokens.populateTransaction(
      tokenIn,
      amountInWei,
      minAmountOutWei,
      userAddress
    );
    
    res.json({
      success: true,
      data: {
        type: 'sell',
        tokenIn,
        tokenOut,
        amountIn,
        amountOut: formatTokenAmount(amountOut),
        minAmountOut: formatTokenAmount(minAmountOutWei),
        to: dexAddress,
        data: swapTx.data,
        requiresApproval: balance >= amountInWei,
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

