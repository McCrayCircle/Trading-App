// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract AlphaX is ERC20 {

    uint8 _decimals = 18;

    constructor() ERC20("Alpha X", "APX") {
    }

    function decimals() public view virtual override returns (uint8) {
        if (_decimals > 0) return _decimals;
        return 18;
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

}