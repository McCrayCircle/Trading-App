const Migrations = artifacts.require("Migrations");
const Router = artifacts.require('Router');

module.exports = async function (deployer, network) {
  if(network === 'mumbai') {
    await deployer.deploy(Router);
    const tradingContract = await Router.deployed();
  }
};
