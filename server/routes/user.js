// 用户状态查询相关路由
const express = require('express');
const router = express.Router();
const { getContract, getProvider, formatTokenAmount } = require('../utils/contracts');
const config = require('../config');
const { ethers } = require('ethers');

/**
 * GET /api/user/status/:address
 * 查询用户当前状态（持有各种代币）
 */
router.get('/status/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid address format'
      });
    }
    
    const dexAddress = config.contracts.DEX;
    const token0Address = config.contracts.Token0;
    const token1Address = config.contracts.Token1;
    const lpTokenAddress = config.contracts.LPToken;
    
    if (!dexAddress) {
      return res.status(500).json({
        success: false,
        error: 'Contract addresses not configured. Please deploy contracts first and ensure .env file exists.',
        hint: 'Run "npm run deploy" to deploy contracts and generate .env file.'
      });
    }
    
    // 检查RPC连接
    try {
      const provider = getProvider();
      await provider.getBlockNumber();
    } catch (rpcError) {
      return res.status(500).json({
        success: false,
        error: 'Cannot connect to blockchain node',
        hint: 'Please ensure Hardhat node is running: "npx hardhat node" or contracts are deployed to a running network.',
        details: rpcError.message
      });
    }
    
    const dex = getContract('DEX', dexAddress);
    
    // 验证DEX合约是否可访问
    try {
      // 先检查合约地址上是否有代码
      const provider = getProvider();
      const code = await provider.getCode(dexAddress);
      if (code === '0x') {
        return res.status(500).json({
          success: false,
          error: 'DEX contract not found at the specified address',
          hint: 'The contract may not be deployed, or the address is incorrect. Please run "npm run deploy" to deploy contracts.',
          details: `No code found at address: ${dexAddress}`
        });
      }
      
      // 尝试调用合约方法
      await dex.token0();
    } catch (contractError) {
      return res.status(500).json({
        success: false,
        error: 'Cannot access DEX contract',
        hint: 'Please verify the DEX_ADDRESS in .env file is correct and contracts are deployed. Run "npm run check" to diagnose the issue.',
        details: contractError.message,
        contractAddress: dexAddress
      });
    }
    
    // 如果合约地址未配置，从DEX合约获取
    let actualToken0, actualToken1, actualLPToken;
    try {
      actualToken0 = token0Address || await dex.token0();
      actualToken1 = token1Address || await dex.token1();
      actualLPToken = lpTokenAddress || await dex.lpToken();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get token addresses from DEX contract',
        details: error.message
      });
    }
    
    // 获取代币合约实例
    const token0Contract = getContract('ERC20', actualToken0);
    const token1Contract = getContract('ERC20', actualToken1);
    const lpTokenContract = getContract('LPToken', actualLPToken);
    
    // 并行查询所有余额
    const [
      ethBalance,
      token0WalletBalance,
      token1WalletBalance,
      token0InternalBalance,
      token1InternalBalance,
      lpTokenBalance,
      token0Allowance,
      token1Allowance,
      token0Info,
      token1Info,
      lpTokenInfo,
      reserves,
    ] = await Promise.all([
      // ETH余额
      getProvider().getBalance(address),
      // 钱包中的代币余额
      token0Contract.balanceOf(address),
      token1Contract.balanceOf(address),
      // DEX内部余额
      dex.balances(address, actualToken0),
      dex.balances(address, actualToken1),
      // LP代币余额
      lpTokenContract.balanceOf(address),
      // 授权额度
      token0Contract.allowance(address, dexAddress),
      token1Contract.allowance(address, dexAddress),
      // 代币信息
      Promise.all([
        token0Contract.name().catch(() => 'Token0'),
        token0Contract.symbol().catch(() => 'TKN0'),
        token0Contract.decimals().catch(() => 18),
      ]),
      Promise.all([
        token1Contract.name().catch(() => 'Token1'),
        token1Contract.symbol().catch(() => 'TKN1'),
        token1Contract.decimals().catch(() => 18),
      ]),
      Promise.all([
        lpTokenContract.name().catch(() => 'LP Token'),
        lpTokenContract.symbol().catch(() => 'LP'),
        lpTokenContract.decimals().catch(() => 18),
      ]),
      // 池子储备
      Promise.all([
        dex.reserve0(),
        dex.reserve1(),
      ]),
    ]);
    
    // 计算LP代币对应的资产价值
    const lpTotalSupply = await lpTokenContract.totalSupply();
    let lpValue0 = 0n;
    let lpValue1 = 0n;
    
    if (lpTotalSupply > 0n && lpTokenBalance > 0n) {
      lpValue0 = (lpTokenBalance * reserves[0]) / lpTotalSupply;
      lpValue1 = (lpTokenBalance * reserves[1]) / lpTotalSupply;
    }
    
    res.json({
      success: true,
      data: {
        address,
        balances: {
          eth: {
            balance: ethBalance.toString(),
            balanceFormatted: ethers.formatEther(ethBalance),
          },
          token0: {
            address: actualToken0,
            name: token0Info[0],
            symbol: token0Info[1],
            decimals: Number(token0Info[2]),
            walletBalance: formatTokenAmount(token0WalletBalance, token0Info[2]),
            internalBalance: formatTokenAmount(token0InternalBalance, token0Info[2]),
            totalBalance: formatTokenAmount(token0WalletBalance + token0InternalBalance, token0Info[2]),
            allowance: formatTokenAmount(token0Allowance, token0Info[2]),
            allowanceFormatted: token0Allowance.toString(),
          },
          token1: {
            address: actualToken1,
            name: token1Info[0],
            symbol: token1Info[1],
            decimals: Number(token1Info[2]),
            walletBalance: formatTokenAmount(token1WalletBalance, token1Info[2]),
            internalBalance: formatTokenAmount(token1InternalBalance, token1Info[2]),
            totalBalance: formatTokenAmount(token1WalletBalance + token1InternalBalance, token1Info[2]),
            allowance: formatTokenAmount(token1Allowance, token1Info[2]),
            allowanceFormatted: token1Allowance.toString(),
          },
          lpToken: {
            address: actualLPToken,
            name: lpTokenInfo[0],
            symbol: lpTokenInfo[1],
            decimals: Number(lpTokenInfo[2]),
            balance: formatTokenAmount(lpTokenBalance, lpTokenInfo[2]),
            balanceRaw: lpTokenBalance.toString(),
            // LP代币对应的资产价值
            underlyingValue: {
              token0: formatTokenAmount(lpValue0, token0Info[2]),
              token1: formatTokenAmount(lpValue1, token1Info[2]),
            }
          }
        },
        pool: {
          reserve0: formatTokenAmount(reserves[0]),
          reserve1: formatTokenAmount(reserves[1]),
          reserve0Raw: reserves[0].toString(),
          reserve1Raw: reserves[1].toString(),
        },
        summary: {
          totalTokens: {
            token0: formatTokenAmount(token0WalletBalance + token0InternalBalance + lpValue0, token0Info[2]),
            token1: formatTokenAmount(token1WalletBalance + token1InternalBalance + lpValue1, token1Info[2]),
          }
        }
      }
    });
  } catch (error) {
    console.error('Error in /api/user/status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
      hint: 'Please check: 1) Contracts are compiled (npm run build), 2) Contracts are deployed (npm run deploy), 3) Hardhat node is running (npx hardhat node)',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/user/tokens/:address
 * 获取用户持有的所有代币列表（简化版）
 */
router.get('/tokens/:address', async (req, res) => {
  try {
    const { address } = req.params;
    
    if (!ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid address format'
      });
    }
    
    // 复用status路由的逻辑，但只返回代币列表
    const dexAddress = config.contracts.DEX;
    const token0Address = config.contracts.Token0;
    const token1Address = config.contracts.Token1;
    const lpTokenAddress = config.contracts.LPToken;
    
    if (!dexAddress) {
      return res.status(500).json({
        success: false,
        error: 'Contract addresses not configured. Please deploy contracts first.'
      });
    }
    
    const dex = getContract('DEX', dexAddress);
    const actualToken0 = token0Address || await dex.token0();
    const actualToken1 = token1Address || await dex.token1();
    const actualLPToken = lpTokenAddress || await dex.lpToken();
    
    const token0Contract = getContract('ERC20', actualToken0);
    const token1Contract = getContract('ERC20', actualToken1);
    const lpTokenContract = getContract('LPToken', actualLPToken);
    
    const [
      token0WalletBalance,
      token1WalletBalance,
      token0InternalBalance,
      token1InternalBalance,
      lpTokenBalance,
      token0Info,
      token1Info,
      lpTokenInfo,
      reserves,
      lpTotalSupply,
    ] = await Promise.all([
      token0Contract.balanceOf(address),
      token1Contract.balanceOf(address),
      dex.balances(address, actualToken0),
      dex.balances(address, actualToken1),
      lpTokenContract.balanceOf(address),
      Promise.all([
        token0Contract.name().catch(() => 'Token0'),
        token0Contract.symbol().catch(() => 'TKN0'),
        token0Contract.decimals().catch(() => 18),
      ]),
      Promise.all([
        token1Contract.name().catch(() => 'Token1'),
        token1Contract.symbol().catch(() => 'TKN1'),
        token1Contract.decimals().catch(() => 18),
      ]),
      Promise.all([
        lpTokenContract.name().catch(() => 'LP Token'),
        lpTokenContract.symbol().catch(() => 'LP'),
        lpTokenContract.decimals().catch(() => 18),
      ]),
      Promise.all([dex.reserve0(), dex.reserve1()]),
      lpTokenContract.totalSupply(),
    ]);
    
    const tokens = [];
    const token0Total = token0WalletBalance + token0InternalBalance;
    const token1Total = token1WalletBalance + token1InternalBalance;
    
    if (token0Total > 0n) {
      tokens.push({
        address: actualToken0,
        symbol: token0Info[1],
        balance: formatTokenAmount(token0Total, token0Info[2]),
        type: 'token'
      });
    }
    
    if (token1Total > 0n) {
      tokens.push({
        address: actualToken1,
        symbol: token1Info[1],
        balance: formatTokenAmount(token1Total, token1Info[2]),
        type: 'token'
      });
    }
    
    if (lpTokenBalance > 0n) {
      let lpValue0 = 0n;
      let lpValue1 = 0n;
      if (lpTotalSupply > 0n) {
        lpValue0 = (lpTokenBalance * reserves[0]) / lpTotalSupply;
        lpValue1 = (lpTokenBalance * reserves[1]) / lpTotalSupply;
      }
      
      tokens.push({
        address: actualLPToken,
        symbol: lpTokenInfo[1],
        balance: formatTokenAmount(lpTokenBalance, lpTokenInfo[2]),
        type: 'lp',
        underlyingValue: {
          token0: formatTokenAmount(lpValue0, token0Info[2]),
          token1: formatTokenAmount(lpValue1, token1Info[2]),
        }
      });
    }
    
    res.json({
      success: true,
      data: {
        address,
        tokens,
        count: tokens.length
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

