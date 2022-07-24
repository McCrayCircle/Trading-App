const express = require('express');
var Web3 = require("web3");
const ethers = require('ethers');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config()
let _provider = new ethers.providers.JsonRpcProvider(process.env.MUMBAI_RPC);

var web3 = new Web3(process.env.MUMBAI_RPC);
var mainnetWeb3 = new Web3(process.env.MAINNET_RPC)

const owner = new ethers.Wallet(process.env.OWNER);
const darkOracleSigner = new ethers.Wallet(process.env.DARKORACLE);
const account = owner.connect(_provider);
const darkOracle = darkOracleSigner.connect(_provider);

const {Block} = require('./db/Block.model')
const TradingAbi = require('./abis/trading.json')
const OracleAbi = require('./abis/oracle.json')
const ETH_USD = require('./abis/ETH-USD.json')

let OracleContract = new ethers.Contract(process.env.ORACLE_CONTRACT, OracleAbi, darkOracle)
let TradingContract = new ethers.Contract(process.env.TRADING_CONTRACT, TradingAbi);
const ETH_USDContract = new mainnetWeb3.eth.Contract(ETH_USD, process.env.ETH_USD_CONTRACT)
const TradingcontractWeb3 = new web3.eth.Contract(TradingAbi, process.env.TRADING_CONTRACT)

const app = express();
app.use(cors());

mongoose.connect(process.env.MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.once('open', () => {
  console.log("Connected to MongoDB")
})

let confirmedBlockNumber;
let id;

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

app.listen(process.env.PORT || 5000, async function () {
  const settleOrders = async(users, productIds, currencies, isLongs, newBlockNumber) => {
    let { answer } = await ETH_USDContract.methods.latestRoundData().call();
    console.log(users, productIds, currencies, isLongs, answer, newBlockNumber)
    // let res = await OracleContract.settleOrders(
    //   users, 
    //   productIds, 
    //   currencies, 
    //   isLongs,
    //   [answer]
    // )
    // console.log('tx data', res)
    // let tx = await res.wait();
    // console.log('tx', tx)
    // if(tx) {
    //   const updateData = {
    //     blockID: newBlockNumber,
    //   }
    //   Block.findByIdAndUpdate(id, updateData, {new: true}, function(err, res) {
    //     if(err) console.log("error", err)
    //     else console.log("successed!!!")
    //   })
    // }
  }

  const getLatestBlockNumber = async () => {
    try {
      // Get latest event's blocknumber and block id from mongodb
      Block.find((err, result) => {
        if (err) console.log("error", err)
        else {
          Object.values(result).map(function(block) {
            console.log('block', block)
            confirmedBlockNumber =  block.blockNumber
            id = block._id
            console.log(id, typeof(id), 'id')
          })
        }
      })
    } catch (error) {
      console.error("GetHead Event Err: add event info", error);
    }
  }

  confirmedBlockNumber = await getLatestBlockNumber();
  
  // confirmedBlockNumber = 27313639;
  
  for(; ;) {
    let latestBlockNumber = await web3.eth.getBlockNumber();
    console.log('latest block number', latestBlockNumber, confirmedBlockNumber, id)
    try{
      await new Promise(async (resolve, reject) => {
        if(latestBlockNumber <= confirmedBlockNumber + 1) {
          console.log('here', latestBlockNumber, confirmedBlockNumber)
          resolve();
        }
        try {
          TradingcontractWeb3.getPastEvents('NewOrder', {
            fromBlock: confirmedBlockNumber,
            toBlock: latestBlockNumber
          }, function(error, events) { return; })
          .then(async(events) => {
            console.log('events', events.length)
            let users = [], productIds = [], currencies = [], isLongs = [];
            for(var i = 0; i < events.length; i ++) {
              const { user, productId, currency, isLong } = events[i].returnValues;
              users.push(user)
              productIds.push(productId)
              currencies.push(currency)
              isLongs.push(isLong)
            }
            settleOrders(users, productIds, currencies, isLongs, latestBlockNumber);
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
  
});