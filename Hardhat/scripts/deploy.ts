import { ethers } from "hardhat";

async function main() {

  // const PoolCAP = await ethers.getContractFactory('PoolCAP');
  // const poolETH = await PoolCAP.deploy('0x9621b905e786556ec1879ac6bc730e617b35e4f0');
  // let poolCAPAddress = await poolETH.deployed();
  // console.log("pool eth", poolCAPAddress.address);

  const PoolRewards = await ethers.getContractFactory('Rewards');
  // const PoolRewardsETH = await PoolRewards.deploy('0x42AcE9aF6042F89421a39463949978e61157EbdE', '0x976f4671d3Bf00eA9FfBAB55174411E9568413dA')
  const PoolRewardsUSDC = await PoolRewards.deploy('0xda608CB4275505A77dA5d79bdcC914e6e2Ab5498', '0x4F18aCA9C35bA6169f8e43179Ab56c0710216eA0')
  // const poolRewardsETHAddr = await PoolRewardsETH.deployed();
  const poolRewardsUSDCAddr = await PoolRewardsUSDC.deployed();
  // console.log('Pool Rewards ETH', poolRewardsETHAddr.address);
  console.log('Pool Rewards USDC', poolRewardsUSDCAddr.address)

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error, 'err');
  process.exitCode = 1;
});
