import { BigInt, store, log, ethereum } from "@graphprotocol/graph-ts"
import {
  Trading,
  PositionUpdated,
  ClosePosition
} from "../generated/Trading/Trading"
import { Data, DayData, Product, Position, Trade } from "../generated/schema"

export const ADDRESS_ZERO = '0x0000000000000000000000000000000000000000'

export const ZERO_BI = BigInt.fromI32(0)
export const ONE_BI = BigInt.fromI32(1)
export const UNIT_BI = BigInt.fromString("100000000")

export const BASE_FEE = BigInt.fromI32(25) // 0.25%
export const LIQUIDATION_THRESHOLD = BigInt.fromI32(8000) // 80%
export const BPS_SCALER = BigInt.fromI32(10000)

function getData(currency: string): Data {
  let data = Data.load(currency)
  if (data == null) {
    data = new Data(currency)
    data.cumulativeFees = ZERO_BI
    data.cumulativePnl = ZERO_BI
    data.cumulativeVolume = ZERO_BI
    data.cumulativeMargin = ZERO_BI
    data.positionCount = ZERO_BI
    data.tradeCount = ZERO_BI
    data.openInterest = ZERO_BI
    data.openInterestLong = ZERO_BI
    data.openInterestShort = ZERO_BI
  }
  return data
}

function getDayData(currency: String, event: ethereum.Event): DayData {

  let timestamp = event.block.timestamp.toI32()
  let day_id = timestamp / 86400
  let dayData = DayData.load(currency + "-" + day_id.toString())

  if (dayData == null) {
    dayData = new DayData(currency + "-" + day_id.toString())
    dayData.date = BigInt.fromI32(day_id * 86400)
    dayData.cumulativeFees = ZERO_BI
    dayData.cumulativePnl = ZERO_BI
    dayData.cumulativeVolume = ZERO_BI
    dayData.cumulativeMargin = ZERO_BI
    dayData.positionCount = ZERO_BI
    dayData.tradeCount = ZERO_BI

    let previous_day_id = day_id - 1
    let dayDataPrevious = DayData.load(currency + "-" + previous_day_id.toString())
    if (dayDataPrevious == null) {
      dayData.openInterest = ZERO_BI
      dayData.openInterestLong = ZERO_BI
      dayData.openInterestShort = ZERO_BI
      dayData.positionCount = ZERO_BI
    } else {
      dayData.openInterest = dayDataPrevious.openInterest
      dayData.openInterestLong = dayDataPrevious.openInterestLong
      dayData.openInterestShort = dayDataPrevious.openInterestShort
      dayData.positionCount = dayDataPrevious.positionCount
    }
    dayData.save()
  }

  return dayData

}

function getProduct(productId: String, currency: String): Product {
  let product = Product.load(productId + "-" + currency)
  if (product == null) {
    product = new Product(productId + "-" + currency)
    product.cumulativeFees = ZERO_BI
    product.cumulativePnl = ZERO_BI
    product.cumulativeVolume = ZERO_BI
    product.cumulativeMargin = ZERO_BI
    product.positionCount = ZERO_BI
    product.tradeCount = ZERO_BI
    product.openInterest = ZERO_BI
    product.openInterestLong = ZERO_BI
    product.openInterestShort = ZERO_BI
    product.save()
  }

  return product

}

function getLiquidationThreshold(productId: String): BigInt {
  if (productId == 'ETH-USD') return BigInt.fromI32(8000)
  if (productId == 'BTC-USD') return BigInt.fromI32(8000)
  return BigInt.fromI32(8000)
}

export function handlePositionUpdated(event: PositionUpdated): void {

  let position = Position.load(event.params.key.toHexString())

  let orderSize = ZERO_BI
  let orderMargin = ZERO_BI

  let isNewPosition = false

  if (position == null) {
    // Create position
    position = new Position(event.params.key.toHexString())
    position.createdAtTimestamp = event.block.timestamp
    position.createdAtBlockNumber = event.block.number
    orderSize = event.params.size
    orderMargin = event.params.margin
    position.fee = ZERO_BI
    isNewPosition = true
  } else {
    orderSize = event.params.size.minus(position.size)
    orderMargin = event.params.margin.minus(position.margin)
  }

  position.productId = event.params.productId
  position.price = event.params.price
  position.margin = event.params.margin
  position.size = event.params.size

  let leverage = event.params.size.times(UNIT_BI).div(event.params.margin)

  position.leverage = leverage

  position.user = event.params.user
  position.currency = event.params.currency

  position.fee = position.fee.plus(event.params.fee)
  position.isLong = event.params.isLong

  position.updatedAtTimestamp = event.block.timestamp
  position.updatedAtBlockNumber = event.block.number

  let liquidationPrice = ZERO_BI
  let liquidationThreshold = getLiquidationThreshold(position.productId.toHexString())
  if (position.isLong) {
    liquidationPrice = position.price.minus((position.price.times(liquidationThreshold).times(BigInt.fromI32(10000))).div(leverage))
  } else {
    liquidationPrice = position.price.plus((position.price.times(liquidationThreshold).times(BigInt.fromI32(10000))).div(leverage))
  }

  position.liquidationPrice = liquidationPrice

  // volume updates
  let data = getData(event.params.currency.toHexString())
  data.cumulativeFees = data.cumulativeFees!.plus(event.params.fee)
  data.cumulativeVolume = data.cumulativeVolume!.plus(orderSize)
  data.cumulativeMargin = data.cumulativeMargin!.plus(orderMargin)

  let dayData = getDayData(event.params.currency.toHexString(), event)
  dayData.cumulativeFees = dayData.cumulativeFees!.plus(event.params.fee)
  dayData.cumulativeVolume = dayData.cumulativeVolume!.plus(orderSize)
  dayData.cumulativeMargin = dayData.cumulativeMargin!.plus(orderMargin)

  let product = getProduct(event.params.productId.toHexString(), event.params.currency.toHexString())
  product.cumulativeFees = product.cumulativeFees!.plus(event.params.fee)
  product.cumulativeVolume = product.cumulativeVolume!.plus(orderSize)
  product.cumulativeMargin = product.cumulativeMargin!.plus(orderMargin)

  if (isNewPosition) {
    data.positionCount = data.positionCount!.plus(ONE_BI)
    dayData.positionCount = dayData.positionCount!.plus(ONE_BI)
    product.positionCount = product.positionCount!.plus(ONE_BI)
  }

  // Open interest
  data.openInterest = data.openInterest!.plus(orderSize)
  dayData.openInterest = dayData.openInterest!.plus(orderSize)
  product.openInterest = product.openInterest!.plus(orderSize)
  if (position.isLong) {
    data.openInterestLong = data.openInterestLong!.plus(orderSize)
    dayData.openInterestLong = dayData.openInterestLong!.plus(orderSize)
    product.openInterestLong = product.openInterestLong!.plus(orderSize)
  } else {
    data.openInterestShort = data.openInterestShort!.plus(orderSize)
    dayData.openInterestShort = dayData.openInterestShort!.plus(orderSize)
    product.openInterestShort = product.openInterestShort!.plus(orderSize)
  }

  position.save()
  data.save()
  dayData.save()
  product.save()

}

export function handleClosePosition(event: ClosePosition): void {

  let position = Position.load(event.params.key.toHexString())

  if (position) {

    let data = getData(event.params.currency.toHexString())
    let dayData = getDayData(event.params.currency.toHexString(), event)
    let product = getProduct(event.params.productId.toHexString(), event.params.currency.toHexString())
    
    data.tradeCount = data.tradeCount!.plus(ONE_BI)

    // create new trade
    let trade = new Trade(data.tradeCount!.toString())

    trade.positionKey = event.params.key.toHexString()

    trade.txHash = event.transaction.hash.toHexString()
    
    trade.productId = event.params.productId
    trade.leverage = position.leverage

    trade.size = event.params.size
    
    trade.entryPrice = position.price
    trade.closePrice = event.params.price

    trade.margin = event.params.margin
    trade.user = event.params.user
    trade.currency = position.currency

    trade.fee = event.params.fee
    trade.pnl = event.params.pnl
    trade.wasLiquidated = event.params.wasLiquidated

    let isFullClose = event.params.margin == position.margin
    
    trade.isFullClose = isFullClose

    trade.isLong = position.isLong

    trade.duration = event.block.timestamp.minus(position.createdAtTimestamp)

    trade.timestamp = event.block.timestamp
    trade.blockNumber = event.block.number

    // Update position

    if (isFullClose) {
      store.remove('Position', event.params.key.toHexString())
      data.positionCount = data.positionCount!.minus(ONE_BI)
      product.positionCount = product.positionCount!.minus(ONE_BI)
      dayData.positionCount = dayData.positionCount!.minus(ONE_BI)
    } else {
      // Update position with partial close, e.g. subtract margin
      position.margin = position.margin.minus(event.params.margin)
      position.size = position.size.minus(event.params.size)
      position.save()
    }

    // update volumes

    data.cumulativePnl = data.cumulativePnl!.plus(event.params.pnl)
    data.cumulativeFees = data.cumulativeFees!.plus(event.params.fee)
    data.cumulativeVolume = data.cumulativeVolume!.plus(event.params.size)
    data.cumulativeMargin = data.cumulativeMargin!.plus(event.params.margin)
    data.tradeCount = data.tradeCount!.plus(ONE_BI)

    dayData.cumulativePnl = dayData.cumulativePnl!.plus(event.params.pnl)
    dayData.cumulativeFees = dayData.cumulativeFees!.plus(event.params.fee)
    dayData.cumulativeVolume = dayData.cumulativeVolume!.plus(event.params.size)
    dayData.cumulativeMargin = dayData.cumulativeMargin!.plus(event.params.margin)
    dayData.tradeCount = dayData.tradeCount!.plus(ONE_BI)

    product.cumulativePnl = product.cumulativePnl!.plus(event.params.pnl)
    product.cumulativeFees = product.cumulativeFees!.plus(event.params.fee)
    product.cumulativeVolume = product.cumulativeVolume!.plus(event.params.size)
    product.cumulativeMargin = product.cumulativeMargin!.plus(event.params.margin)
    product.tradeCount = product.tradeCount!.plus(ONE_BI)

    // Open interest
    data.openInterest = data.openInterest!.minus(event.params.size)
    dayData.openInterest = dayData.openInterest!.minus(event.params.size)
    product.openInterest = product.openInterest!.minus(event.params.size)
    if (position.isLong) {
      data.openInterestLong = data.openInterestLong!.minus(event.params.size)
      dayData.openInterestLong = dayData.openInterestLong!.minus(event.params.size)
      product.openInterestLong = product.openInterestLong!.minus(event.params.size)
    } else {
      data.openInterestShort = data.openInterestShort!.minus(event.params.size)
      dayData.openInterestShort = dayData.openInterestShort!.minus(event.params.size)
      product.openInterestShort = product.openInterestShort!.minus(event.params.size)
    }

    trade.save()
    data.save()
    dayData.save()
    product.save()

  }

}
