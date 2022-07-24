const mongoose = require("mongoose")

const blockSchema = new mongoose.Schema({
  blockID: {
    type: Number,
    require: true
  },
  blockNumber: {
    type: Number,
    require: true
  }
})

const Block = mongoose.model('Block', blockSchema);

module.exports = {Block}