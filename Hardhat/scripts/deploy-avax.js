// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");
const { ethers } = require('hardhat');

const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000';

const toBytes32 = function (string) {
  return ethers.utils.formatBytes32String(string);
}
const fromBytes32 = function (string) {
  return ethers.utils.parseBytes32String(string);
}

const parseUnits = function (number, units) {
  return ethers.utils.parseUnits(number, units || 8);
}

const formatUnits = function (number, units) {
  return ethers.utils.formatUnits(number, units || 8);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  const provider = hre.ethers.provider;
  const signer = await provider.getSigner();

  /*
  await hre.ethers.provider.send('hardhat_setNonce', [
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
    "0x3b"
  ]);
  return;
  */

  const darkOracleAddress = '0x17f81a65F922dC0e50Fc4375E33A36Cb8089850c';

  const account = await signer.getAddress();
  console.log('account', account);
  console.log('Account balance', formatUnits(await provider.getBalance(account), 18));

  // Router
  const Router = await hre.ethers.getContractFactory("Router");
  const router = await Router.deploy();
  await router.deployed();
  console.log("Router deployed to:", router.address);

  // Trading
  const Trading = await hre.ethers.getContractFactory("Trading");
  const trading = await Trading.deploy();
  await trading.deployed();
  console.log("Trading deployed to:", trading.address);

  // Oracle
  const Oracle = await hre.ethers.getContractFactory("Oracle");
  const oracle = await Oracle.deploy();
  await oracle.deployed();
  console.log("Oracle deployed to:", oracle.address);

  // Treasury
  const Treasury = await hre.ethers.getContractFactory("Treasury");
  const treasury = await Treasury.deploy();
  await treasury.deployed();
  console.log("Treasury deployed to:", treasury.address);

  // APX, USDC, MIM

  const apx = {address: '0x0000000000000000000000000000000000000001'};
  console.log("apx:", apx.address);

  const usdc = {address: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8'};
  console.log("usdc:", usdc.address);

  const mim = {address: '0x130966628846BFd36ff31a822705796e8cb8C18D'};
  console.log("mim:", mim.address);


  // PoolAPX
  const PoolAPX = await hre.ethers.getContractFactory("PoolAPX");
  const poolAPX = await PoolAPX.deploy(apx.address);
  await poolAPX.deployed();
  console.log("PoolAPX deployed to:", poolAPX.address);

  // Pools (AVAX, USDC, MIM)
  const Pool = await hre.ethers.getContractFactory("Pool");
  
  const poolAVAX = await Pool.deploy(ADDRESS_ZERO);
  await poolAVAX.deployed();
  console.log("poolAVAX deployed to:", poolAVAX.address);

  const poolUSDC = await Pool.deploy(usdc.address);
  await poolUSDC.deployed();
  console.log("poolUSDC deployed to:", poolUSDC.address);

  const poolMIM = await Pool.deploy(usdc.address);
  await poolMIM.deployed();
  console.log("poolMIM deployed to:", poolMIM.address);
  
  // Rewards

  const Rewards = await hre.ethers.getContractFactory("Rewards");

  // Rewards for Pools
  const poolRewardsAVAX = await Rewards.deploy(poolAVAX.address, ADDRESS_ZERO);
  await poolRewardsAVAX.deployed();
  console.log("poolRewardsAVAX deployed to:", poolRewardsAVAX.address);

  const poolRewardsUSDC = await Rewards.deploy(poolUSDC.address, usdc.address);
  await poolRewardsUSDC.deployed();
  console.log("poolRewardsUSDC deployed to:", poolRewardsUSDC.address);

  const poolRewardsMIM = await Rewards.deploy(poolMIM.address, mim.address);
  await poolRewardsMIM.deployed();
  console.log("poolRewardsMIM deployed to:", poolRewardsMIM.address);

  // Rewards for Apx
  const apxRewardsAVAX = await Rewards.deploy(poolAPX.address, ADDRESS_ZERO);
  await apxRewardsAVAX.deployed();
  console.log("apxRewardsAVAX deployed to:", apxRewardsAVAX.address);

  const apxRewardsUSDC = await Rewards.deploy(poolAPX.address, usdc.address);
  await apxRewardsUSDC.deployed();
  console.log("apxRewardsUSDC deployed to:", apxRewardsUSDC.address);

  const apxRewardsMIM = await Rewards.deploy(poolAPX.address, mim.address);
  await apxRewardsMIM.deployed();
  console.log("apxRewardsMIM deployed to:", apxRewardsMIM.address);

  // Router setup
  await router.setContracts(
    treasury.address,
    trading.address,
    poolAPX.address,
    oracle.address,
    darkOracleAddress
  );

  await router.setPool(ADDRESS_ZERO, poolAVAX.address);
  await router.setPool(usdc.address, poolUSDC.address);
  await router.setPool(mim.address, poolMIM.address);

  // Fee share setup
  await router.setPoolShare(ADDRESS_ZERO, 5000);
  await router.setPoolShare(usdc.address, 5000);
  await router.setPoolShare(mim.address, 5000);
  console.log("set pool shares");

  await router.setApxShare(ADDRESS_ZERO, 1000);
  await router.setApxShare(usdc.address, 1000);
  await router.setApxShare(mim.address, 1000);
  console.log("set Apx shares");

  await router.setPoolRewards(ADDRESS_ZERO, poolRewardsAVAX.address);
  await router.setPoolRewards(usdc.address, poolRewardsUSDC.address);
  await router.setPoolRewards(mim.address, poolRewardsMIM.address);

  await router.setApxRewards(ADDRESS_ZERO, apxRewardsAVAX.address);
  await router.setApxRewards(usdc.address, apxRewardsUSDC.address);
  await router.setApxRewards(mim.address, apxRewardsMIM.address);
  
  console.log("Setup router contracts");

  await router.setCurrencies([ADDRESS_ZERO, usdc.address, mim.address]);
  console.log("Setup router currencies");

  // Link contracts with Router, which also sets their dependent contract addresses
  await trading.setRouter(router.address);
  await treasury.setRouter(router.address);
  await poolAPX.setRouter(router.address);
  await oracle.setRouter(router.address);
  await poolAVAX.setRouter(router.address);
  await poolUSDC.setRouter(router.address);
  await poolMIM.setRouter(router.address);
  await poolRewardsAVAX.setRouter(router.address);
  await poolRewardsUSDC.setRouter(router.address);
  await poolRewardsMIM.setRouter(router.address);
  await apxRewardsAVAX.setRouter(router.address);
  await apxRewardsUSDC.setRouter(router.address);
  await apxRewardsMIM.setRouter(router.address);

  console.log("Linked router with contracts");

  const network = hre.network.name;
  console.log('network', network);

  // Add products

  const products = [
    {
      id: 'ETH-USD',
      maxLeverage: 50,
      fee: 0.1,
      interest: 16,
      liquidationThreshold: 80
    },
    {
      id: 'BTC-USD',
      maxLeverage: 50,
      fee: 0.1,
      interest: 16,
      liquidationThreshold: 80
    }
  ];

  for (const p of products) {
    await trading.addProduct(toBytes32(p.id), [
      parseUnits(""+p.maxLeverage),
      parseInt(p.liquidationThreshold * 100),
      parseInt(p.fee * 10000),
      parseInt(p.interest * 100),
    ]);
    console.log('Added product ' + p.id);
  }

  // // Mint some APX, USDC
  // await usdc.mint(parseUnits("100000", 6));
  // await apx.mint(parseUnits("1000", 18));

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
});