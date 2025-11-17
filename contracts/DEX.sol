// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {LPToken} from "./LPToken.sol";

/**
 * Minimal single-pair AMM DEX
 * - Supports deposits/withdrawals (internal balances)
 * - Constant product market maker (x * y = k) with 0.3% fee
 * - Liquidity add/remove with LP token
 * - Price utilities
 */
contract DEX is ReentrancyGuard {
	using SafeERC20 for IERC20;

	address public immutable token0;
	address public immutable token1;
	LPToken public immutable lpToken;

	uint256 public reserve0; // tracked reserves inside the pool
	uint256 public reserve1;

	// user internal balances for simple custody flows
	mapping(address => mapping(address => uint256)) public balances; // user => token => amount

	uint256 private constant FEE_NUMERATOR = 997; // 0.3% fee => 1000 - 3 = 997
	uint256 private constant FEE_DENOMINATOR = 1000;

	event Deposited(address indexed user, address indexed token, uint256 amount);
	event Withdrawn(address indexed user, address indexed token, uint256 amount);
	event LiquidityAdded(address indexed provider, uint256 amount0, uint256 amount1, uint256 lpMinted);
	event LiquidityRemoved(address indexed provider, uint256 amount0, uint256 amount1, uint256 lpBurned);
	event Swapped(address indexed trader, address indexed tokenIn, uint256 amountIn, address indexed tokenOut, uint256 amountOut, address to);

	error InvalidToken();
	error InsufficientAmount();
	error InsufficientLiquidity();
	error AmountOutTooLow();

	constructor(address _token0, address _token1) {
		require(_token0 != _token1, "IDENTICAL_TOKENS");
		token0 = _token0;
		token1 = _token1;
		lpToken = new LPToken("LP-DEX", "LPD", address(this));
	}

	// ----------- Internal helpers -----------
	function _isSupported(address token) internal view returns (bool) {
		return token == token0 || token == token1;
	}

	function _updateReserves(uint256 newR0, uint256 newR1) internal {
		reserve0 = newR0;
		reserve1 = newR1;
	}

	// ----------- User custody -----------
	function deposit(address token, uint256 amount) external nonReentrant {
		if (!_isSupported(token)) revert InvalidToken();
		if (amount == 0) revert InsufficientAmount();
		IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
		balances[msg.sender][token] += amount;
		emit Deposited(msg.sender, token, amount);
	}

	function withdraw(address token, uint256 amount) external nonReentrant {
		if (!_isSupported(token)) revert InvalidToken();
		if (amount == 0) revert InsufficientAmount();
		uint256 bal = balances[msg.sender][token];
		require(bal >= amount, "INSUFFICIENT_BALANCE");
		balances[msg.sender][token] = bal - amount;
		IERC20(token).safeTransfer(msg.sender, amount);
		emit Withdrawn(msg.sender, token, amount);
	}

	// ----------- Liquidity -----------
	function addLiquidity(uint256 amount0Desired, uint256 amount1Desired) external nonReentrant returns (uint256 lpMinted) {
		if (amount0Desired == 0 || amount1Desired == 0) revert InsufficientAmount();

		// Pull tokens from user's internal balances first if available; otherwise from wallet
		uint256 fromBal0 = balances[msg.sender][token0];
		uint256 fromBal1 = balances[msg.sender][token1];

		if (fromBal0 >= amount0Desired) {
			balances[msg.sender][token0] = fromBal0 - amount0Desired;
		} else {
			IERC20(token0).safeTransferFrom(msg.sender, address(this), amount0Desired);
		}
		if (fromBal1 >= amount1Desired) {
			balances[msg.sender][token1] = fromBal1 - amount1Desired;
		} else {
			IERC20(token1).safeTransferFrom(msg.sender, address(this), amount1Desired);
		}

		uint256 _reserve0 = reserve0;
		uint256 _reserve1 = reserve1;

		if (_reserve0 == 0 && _reserve1 == 0) {
			// initial liquidity, mint sqrt(amount0 * amount1)
			lpMinted = _sqrt(amount0Desired * amount1Desired);
		} else {
			// maintain ratio
			uint256 lpSupply = lpToken.totalSupply();
			uint256 lp0 = (amount0Desired * lpSupply) / _reserve0;
			uint256 lp1 = (amount1Desired * lpSupply) / _reserve1;
			lpMinted = lp0 < lp1 ? lp0 : lp1;
		}
		require(lpMinted > 0, "LP_ZERO");
		lpToken.mint(msg.sender, lpMinted);

		_updateReserves(_reserve0 + amount0Desired, _reserve1 + amount1Desired);
		emit LiquidityAdded(msg.sender, amount0Desired, amount1Desired, lpMinted);
	}

	function removeLiquidity(uint256 lpAmount) external nonReentrant returns (uint256 amount0, uint256 amount1) {
		if (lpAmount == 0) revert InsufficientAmount();

		uint256 _reserve0 = reserve0;
		uint256 _reserve1 = reserve1;
		uint256 lpSupply = lpToken.totalSupply();
		require(lpSupply > 0, "NO_LP");

		amount0 = (lpAmount * _reserve0) / lpSupply;
		amount1 = (lpAmount * _reserve1) / lpSupply;
		require(amount0 > 0 && amount1 > 0, "AMOUNTS_ZERO");

		lpToken.burn(msg.sender, lpAmount);

		_updateReserves(_reserve0 - amount0, _reserve1 - amount1);

		IERC20(token0).safeTransfer(msg.sender, amount0);
		IERC20(token1).safeTransfer(msg.sender, amount1);

		emit LiquidityRemoved(msg.sender, amount0, amount1, lpAmount);
	}

	// ----------- Swaps -----------
	function swapExactTokensForTokens(address tokenIn, uint256 amountIn, uint256 minAmountOut, address to) external nonReentrant returns (uint256 amountOut) {
		if (!_isSupported(tokenIn)) revert InvalidToken();
		if (amountIn == 0) revert InsufficientAmount();
		address tokenOut = tokenIn == token0 ? token1 : token0;

		// Try to use internal balance first; otherwise pull from wallet
		uint256 fromBal = balances[msg.sender][tokenIn];
		if (fromBal >= amountIn) {
			balances[msg.sender][tokenIn] = fromBal - amountIn;
		} else {
			IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
		}

		(uint256 rIn, uint256 rOut) = tokenIn == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
		if (rIn == 0 || rOut == 0) revert InsufficientLiquidity();

		amountOut = getAmountOut(amountIn, tokenIn);
		if (amountOut < minAmountOut) revert AmountOutTooLow();

		// update reserves
		if (tokenIn == token0) {
			_updateReserves(rIn + amountIn, rOut - amountOut);
		} else {
			_updateReserves(rOut - amountOut, rIn + amountIn); // note order switch
		}

		IERC20(tokenOut).safeTransfer(to, amountOut);
		emit Swapped(msg.sender, tokenIn, amountIn, tokenOut, amountOut, to);
	}

	// ----------- Pricing -----------
	function getAmountOut(uint256 amountIn, address tokenIn) public view returns (uint256) {
		if (!_isSupported(tokenIn)) revert InvalidToken();
		(uint256 rIn, uint256 rOut) = tokenIn == token0 ? (reserve0, reserve1) : (reserve1, reserve0);
		if (amountIn == 0 || rIn == 0 || rOut == 0) return 0;
		uint256 amountInWithFee = amountIn * FEE_NUMERATOR;
		uint256 numerator = amountInWithFee * rOut;
		uint256 denominator = rIn * FEE_DENOMINATOR + amountInWithFee;
		return numerator / denominator;
	}

	function getPrice(address baseToken) external view returns (uint256 numerator, uint256 denominator) {
		if (!_isSupported(baseToken)) revert InvalidToken();
		// price of baseToken in terms of the other token as a fraction
		if (baseToken == token0) {
			return (reserve1, reserve0); // price = reserve1 / reserve0
		} else {
			return (reserve0, reserve1);
		}
	}

	// ----------- Math -----------
	function _sqrt(uint256 y) internal pure returns (uint256 z) {
		if (y > 3) {
			z = y;
			uint256 x = y / 2 + 1;
			while (x < z) {
				z = x;
				x = (y / x + x) / 2;
			}
		} else if (y != 0) {
			z = 1;
		}
	}
}

