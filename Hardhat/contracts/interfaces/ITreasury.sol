// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ITreasury {
    function fundOracle(address destination, uint256 amount) external;

    function notifyFeeReceived(address currency, uint256 amount) external;

}
