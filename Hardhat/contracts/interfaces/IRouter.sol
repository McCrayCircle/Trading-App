// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IRouter {
    function trading() external view returns (address);

    function apxPool() external view returns (address);

    function oracle() external view returns (address);

    function treasury() external view returns (address);

    function darkOracle() external view returns (address);

    function isSupportedCurrency(address currency) external view returns (bool);

    function currencies(uint256 index) external view returns (address);

    function currenciesLength() external view returns (uint256);

    function getDecimals(address currency) external view returns(uint8);

    function getPool(address currency) external view returns (address);

    function getPoolShare(address currency) external view returns(uint256);

    function getApxShare(address currency) external view returns(uint256);

    function getPoolRewards(address currency) external view returns (address);

    function getApxRewards(address currency) external view returns (address);
}
