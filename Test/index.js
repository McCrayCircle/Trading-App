var Web3 = require("web3");
const ethers = require('ethers');
require('dotenv').config()
let _provider = new ethers.providers.JsonRpcProvider(process.env.MUMBAI_RPC);

var web3 = new Web3(process.env.MUMBAI_RPC);
var mainnetWeb3 = new Web3(process.env.MAINNET_RPC)

const owner = new ethers.Wallet(process.env.OWNER);
const darkOracleSigner = new ethers.Wallet(process.env.DARKORACLE);
const account = owner.connect(_provider);
const darkOracle = darkOracleSigner.connect(_provider);

const TradingAbi = require('./abis/trading.json')
const OracleAbi = require('./abis/oracle.json')
const ETH_USD = require('./abis/ETH-USD.json')

let OracleContract = new ethers.Contract(process.env.ORACLE_CONTRACT, OracleAbi, darkOracle)
let TradingContract = new ethers.Contract(process.env.TRADING_CONTRACT, TradingAbi);
const ETH_USDContract = new mainnetWeb3.eth.Contract(ETH_USD, process.env.ETH_USD_CONTRACT)
const TradingcontractWeb3 = new web3.eth.Contract(TradingAbi, process.env.TRADING_CONTRACT)

const parseUnits = (number, units) => {
  if (typeof(number) == 'number') {
  	number = "" + number;
  }
  return ethers.utils.parseUnits(number, units || 8);
}

const toBytes32 = (string) => {
  return ethers.utils.formatBytes32String(string);
}

const submitOrder = async() => {
  let res = await TradingContract.submitOrder(
    toBytes32('ETH-USD'),
    '0x4F18aCA9C35bA6169f8e43179Ab56c0710216eA0',
    false,
    parseUnits(2.02000000),
    parseUnits(101),
    {value: parseUnits(0.000000000000, 18)}
  )
  console.log('res', res)
}

const cancelOrder = async() => {
  let res = await TradingContract.cancelOrder(
    toBytes32('ETH-USD'),
    '0x4F18aCA9C35bA6169f8e43179Ab56c0710216eA0',
    true
  )
  console.log('res', res)
}

const settleOrders = async(user, productId, currency, isLong) => {
  let { answer } = await ETH_USDContract.methods.latestRoundData().call();
  console.log('ETH price', answer)
  let res = await OracleContract.settleOrders(
    user, 
    productId, 
    currency, 
    isLong,
    answer
  )
  let tx = await res.wait();
  console.log('tx', tx)
}

let confirmedBlockNumber = 27313100;

var init = async function () {
  for(; ;) {
    let latestBlockNumber = await web3.eth.getBlockNumber();
    console.log('latest block number', latestBlockNumber)
    try{
      await new Promise(async (resolve, reject) => {
        if(latestBlockNumber <= confirmedBlockNumber + 1) resolve();
        try {
          TradingcontractWeb3.getPastEvents('NewOrder', {
            fromBlock: confirmedBlockNumber,
            toBlock: latestBlockNumber
          }, function(error, events) { return; })
          .then(async(events) => {
            console.log('events', events.length)
            for(var i = 0; i < events.length; i ++) {
              const { key, user, productId, currency, isLong, margin, size, isClose } = events[i].returnValues;
              settleOrders(user, productId, currency, isLong);
            }
          })
        } catch(e) {
          console.log('error', e)
          reject(e)
        }
      })
    } catch(e) {
      console.log('error', e)
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 10 * 1000)
    })
  }

};

init();