
const ethers = require('ethers');
const TreasuryAbi = require('./abis/treasury.json')
require('dotenv').config()

let _provider = new ethers.providers.JsonRpcProvider(process.env.MUMBAI_RPC);
const account = new ethers.Wallet(process.env.OWNER, _provider);

const TreasuryContract = new ethers.Contract(process.env.TREASURY_CONTRACT, TreasuryAbi, account);

const gas = {
  gasPrice: ethers.utils.parseUnits('100', 'gwei'),
  gasLimit: 20000000
}

const sendApxReward = async() => {
  try{
    console.log(1)
    let res = await TreasuryContract.sendApxReward('0xc5f7dE696E222DDfc57F8d1ABc2D6919Fc815598')
    console.log('res', res)
    let tx = await res.wait()
    console.log('res', tx)
  } catch(e) {
    console.log('error', e)
  }

}

sendApxReward();