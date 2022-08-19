
var Web3 = require("web3");
const ethers = require('ethers');
const TreasuryAbi = require('./abis/treasury.json')
require('dotenv').config()

const TradingAbi = require('./abis/trading.json')
const { Block } = require('./db/Block.model')

let _provider = new ethers.providers.JsonRpcProvider(process.env.MUMBAI_RPC);
const account = new ethers.Wallet(process.env.OWNER, _provider);

const TreasuryContract = new ethers.Contract(process.env.TREASURY_CONTRACT, TreasuryAbi, account);

const gas = {
  gasPrice: ethers.utils.parseUnits('100', 'gwei'),
  gasLimit: 20000000
}

const rpcs = [
  'https://polygon-mumbai.g.alchemy.com/v2/g-7R1YtzCCSO3rIyc9pKFmRs48rt2EqX',
  'https://polygon-mumbai.g.alchemy.com/v2/zc4CzqwB0LjNvHXdAYwGFQrDqfE1uNY-',
  'https://polygon-mumbai.g.alchemy.com/v2/VFCowlE8aG7cSC17T52wbQAL387ycrzc',
  'https://polygon-mumbai.g.alchemy.com/v2/i3ONwE5lyqGdDggxSuRPb102ek8hFhHU'
]

const crateTrading = (index) => {
  return new web3.eth.Contract(TradingAbi, rpcs[index])
}

let i = 0;

const sendApxReward = async() => {
  let amount = ethers.utils.parseUnits('0.000000000000000004', 'ether');
  console.log('amount', amount)
  try{
    console.log(1)
    let res = await TreasuryContract.sendApxReward('0xAd825aD3af1807EeA0cfF332037A0E34D72bCad8', 11)
    console.log('res', res)
    let tx = await res.wait()
    console.log('res', tx)
  } catch(e) {
    console.log('error', e)
  }

}

sendApxReward()

const getLatestBlockNumber = async () => {
  try {
    // Get latest event's blocknumber and block id from mongodb
    Block.find((err, result) => {
      if (err) console.log("error", err)
      else {
        Object.values(result).map(function (block) {
          confirmedBlockNumber = block.blockNumber
          id = block._id
        })
      }
    })
  } catch (error) {
    console.error("GetHead Event Err: add event info", error);
  }
}


const main = async() => {
  for(; ;) {
    var web3 = new Web3(rpcs[i]);
    console.log('web3', web3._requestManager.provider.host)
    confirmedBlockNumber = await getLatestBlockNumber();
    let latestBlockNumber = await web3.eth.getBlockNumber();
    console.log('block number', latestBlockNumber, confirmedBlockNumber)
    try{
      await new Promise(async (resolve, reject) => {
        if (latestBlockNumber <= confirmedBlockNumber + 1) {
          console.log('here', latestBlockNumber, confirmedBlockNumber)
          resolve();
        }
        try {
          new web3.eth.Contract(TradingAbi, process.env.TRADING_CONTRACT).getPastEvents('NewOrder', {
            fromBlock: confirmedBlockNumber,
            toBlock: latestBlockNumber
          }, function (error, events) { return; })
            .then(async (events) => {
              console.log('event', events)
            })
          resolve()
        } catch (e) {
          console.log('error', e)
          reject(e)
        }
      })
    } catch (e) {
      console.log('error', e)
    }
  
    await new Promise((resolve) => {
      setTimeout(resolve, 2 * 1000)
    })
    i++
    if(i == 4) i = 0

  }
}