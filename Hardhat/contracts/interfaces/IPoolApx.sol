// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IPoolApx {
  function totalSupply() external view returns(uint256);

  function getBalance(address account) external view returns(uint256);
}
