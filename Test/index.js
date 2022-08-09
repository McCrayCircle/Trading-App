const express = require('express');
var Web3 = require("web3");
const ethers = require('ethers');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config()
let _provider = new ethers.providers.JsonRpcProvider(process.env.MUMBAI_RPC);

var web3 = new Web3(process.env.MUMBAI_RPC);
var mainnetWeb3 = new Web3(process.env.MAINNET_RPC)

const darkOracleSigner = new ethers.Wallet(process.env.DARKORACLE);
const account = new ethers.Wallet(process.env.OWNER, _provider);
const darkOracle = darkOracleSigner.connect(_provider);
const account2 = new ethers.Wallet(process.env.ACCOUNT2, _provider)

const { Block } = require('./db/Block.model')
const TradingAbi = require('./abis/trading.json')
const OracleAbi = require('./abis/oracle.json')
const ETH_USD = require('./abis/ETH-USD.json')
const BTC_USD = require('./abis/BTC-USD.json')

const OracleContract = new ethers.Contract(process.env.ORACLE_CONTRACT, OracleAbi, darkOracle)
const TradingContract = new ethers.Contract(process.env.TRADING_CONTRACT, TradingAbi, account);
const ETH_USDContract = new mainnetWeb3.eth.Contract(ETH_USD, process.env.ETH_USD_CONTRACT)
const BTC_USDContract = new mainnetWeb3.eth.Contract(BTC_USD, process.env.BTC_USD_CONTRACT)
const TradingcontractWeb3 = new web3.eth.Contract(TradingAbi, process.env.TRADING_CONTRACT)
const OracleContract1 = new web3.eth.Contract(OracleAbi, process.env.ORACLE_CONTRACT)

const app = express();
app.use(cors());

mongoose.connect(process.env.MONGODB_URL, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.once('open', () => {
  console.log("Connected to MongoDB")
})

let confirmedBlockNumber;
let id;

const gas = {
  gasPrice: ethers.utils.parseUnits('100', 'gwei'),
  gasLimit: 20000000
}

const parseUnits = (number, units) => {
  if (typeof (number) == 'number') {
    number = "" + number;
  }
  return ethers.utils.parseUnits(number, units || 8);
}

const toBytes32 = (string) => {
  return ethers.utils.formatBytes32String(string);
}

const submitOrder = async () => {
  let res = await TradingContract.submitOrder(
    toBytes32('ETH-USD'),
    '0x4F18aCA9C35bA6169f8e43179Ab56c0710216eA0',
    false,
    parseUnits(2.02000000),
    parseUnits(101),
    { value: parseUnits(0.000000000000, 18) }
  )
  console.log('res', res)
}

const cancelOrder = async () => {
  let res = await TradingContract.cancelOrder(
    toBytes32('ETH-USD'),
    '0x976f4671d3Bf00eA9FfBAB55174411E9568413dA',
    true
  )
  console.log('res', res)
  let result = await res.wait();
  console.log('result', result)
}

app.listen(process.env.PORT || 5000, async function () {
  const settleOrders = async (user, productId, currency, isLong, isClose, answer, nonce, newBlockNumber) => {
    console.log('settle order')
    let data = OracleContract1.methods.settleOrders(
      [user],
      [productId],
      [currency],
      [isLong],
      [answer]
    )

    let tx = {
      nonce: nonce,
      to: '0xa1839C3acdEBAdA725F292252a4AaeF2DA711f15',
      ...gas,
      data: data.encodeABI(),
      chainId: 80001
    }
    try {
      let res = await darkOracleSigner.signTransaction(tx)
      // console.log('res', res)
      if (res) {
        let result = await _provider.sendTransaction(res)
        if (result) {
          // console.log('result', result)
          let confirmedData = await result.wait();
          if (confirmedData) {
            console.log('confirmed hash', confirmedData.transactionHash)
          }
        }
      }
    } catch (e) {
      console.log('error-----', e)
    }
  }

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

  for (; ;) {
    confirmedBlockNumber = await getLatestBlockNumber();
    let latestBlockNumber = await web3.eth.getBlockNumber();
    try {
      await new Promise(async (resolve, reject) => {
        if (latestBlockNumber <= confirmedBlockNumber + 1) {
          console.log('here', latestBlockNumber, confirmedBlockNumber)
          resolve();
        }
        try {
          TradingcontractWeb3.getPastEvents('NewOrder', {
            fromBlock: confirmedBlockNumber,
            toBlock: latestBlockNumber
          }, function (error, events) { return; })
            .then(async (events) => {
              let date_ob = new Date();
              let date = ("0" + date_ob.getDate()).slice(-2);
              let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
              let year = date_ob.getFullYear();
              let hours = date_ob.getHours();
              let minutes = date_ob.getMinutes();
              let seconds = date_ob.getSeconds();
              let currentTime = year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;
              console.log('currentTime->', currentTime, 'blockNumber->', latestBlockNumber, confirmedBlockNumber, ', events->', events.length)
              if (events.length > 0) {
                const updateData = {
                  blockNumber: latestBlockNumber,
                }
                Block.findByIdAndUpdate(id, updateData, { new: true }, function (err, res) {
                  if (err) console.log("error", err)
                  else console.log("Block number updated!!!")
                })
                let nonce = await web3.eth.getTransactionCount('0xfc69685086C75Dbbb3834a524F9D36ECB8bB1745')
                for (var i = 0; i < events.length; i++) {
                  const { user, productId, currency, isLong, isClose } = events[i].returnValues;
                  console.table({ 
                    "tx": events[i].transactionHash, 
                    "user": user, 
                    "productId": productId, 
                    "currency": currency, 
                    "isLong": isLong, 
                    "isClose": isClose 
                  })
                  let price;
                  if(productId == '0x4254432d55534400000000000000000000000000000000000000000000000000'){
                    let {answer} = await BTC_USDContract.methods.latestRoundData().call();
                    price = answer
                  } else {
                    let {answer} = await ETH_USDContract.methods.latestRoundData().call();
                    price = answer
                  }

                  await settleOrders(user, productId, currency, isLong, isClose, price, nonce, latestBlockNumber);
                  nonce++;
                }
              }
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
      setTimeout(resolve, 40 * 1000)
    })
  }

});
