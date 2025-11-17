const { ethers } = require("hardhat");

async function main() {
	const [user] = await ethers.getSigners();
	console.log("User:", user.address);

	// Deploy stack if needed
	const supply = ethers.parseUnits("1000000", 18);
	const TestToken = await ethers.getContractFactory("TestToken");
	const tokenA = await TestToken.deploy("TokenA", "TKA", supply);
	const tokenB = await TestToken.deploy("TokenB", "TKB", supply);
	await tokenA.waitForDeployment();
	await tokenB.waitForDeployment();
	const DEX = await ethers.getContractFactory("DEX");
	const dex = await DEX.deploy(await tokenA.getAddress(), await tokenB.getAddress());
	await dex.waitForDeployment();

	console.log("TokenA:", await tokenA.getAddress());
	console.log("TokenB:", await tokenB.getAddress());
	console.log("DEX:", await dex.getAddress());

	// Seed pool
	await (await tokenA.approve(await dex.getAddress(), ethers.MaxUint256)).wait();
	await (await tokenB.approve(await dex.getAddress(), ethers.MaxUint256)).wait();
	await (await dex.addLiquidity(ethers.parseUnits("5000", 18), ethers.parseUnits("5000", 18))).wait();

	// Deposit/Withdraw flow
	await (await tokenA.approve(await dex.getAddress(), ethers.parseUnits("1000", 18))).wait();
	await (await dex.deposit(await tokenA.getAddress(), ethers.parseUnits("1000", 18))).wait();
	const balBefore = await dex.balances(user.address, await tokenA.getAddress());
	console.log("Internal balance A:", ethers.formatUnits(balBefore, 18));
	await (await dex.withdraw(await tokenA.getAddress(), ethers.parseUnits("250", 18))).wait();
	const balAfter = await dex.balances(user.address, await tokenA.getAddress());
	console.log("Internal balance A after withdraw:", ethers.formatUnits(balAfter, 18));

	// Swap using internal balance
	const priceOut = await dex.getAmountOut(ethers.parseUnits("100", 18), await tokenA.getAddress());
	console.log("Quoted out for 100 A -> B:", ethers.formatUnits(priceOut, 18));
	await (await dex.swapExactTokensForTokens(await tokenA.getAddress(), ethers.parseUnits("100", 18), 0, user.address)).wait();
	console.log("Swapped 100 A to B");
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});

