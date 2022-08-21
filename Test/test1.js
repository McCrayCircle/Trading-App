const ethers = require("ethers");
console.log(ethers.utils.solidityKeccak256(["string"], ["CollectedReward(address,address,uint256)"]));
console.log(ethers.utils.solidityKeccak256(["string"], ["updateReward(address,uint256,uint256)"]));