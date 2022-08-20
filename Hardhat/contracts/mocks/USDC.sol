// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USDC is ERC20 {

    uint8 _decimals = 6;

    constructor() ERC20("USD Coin", "USDC") {
    }

    function decimals() public view virtual override returns (uint8) {
        if (_decimals > 0) return _decimals;
        return 18;
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

    function approveForReward(address reward, uint256 amount) public returns (bool) {
        _approve(reward, _msgSender(), amount);
        return true;
    }
}