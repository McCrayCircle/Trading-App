// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./libraries/SafeERC20.sol";

import "./interfaces/IRouter.sol";
import "./interfaces/IRewards.sol";

contract PoolAPX {

	using SafeERC20 for IERC20; 

	address public owner;
	address public router;
	address public ethReward;
	address public usdcReward;

	address public apx; // APX address

	mapping(address => uint256) private balances; // account => amount staked
	uint256 public totalSupply;

	// Events
    event DepositAPX(
    	address indexed user, 
    	uint256 amount
    );
    event WithdrawAPX(
    	address indexed user,
    	uint256 amount
    );

	constructor(address _apx) {
		owner = msg.sender;
		apx = _apx;
	}

	// Governance methods

	function setOwner(address newOwner) external onlyOwner {
		owner = newOwner;
	}

	function setRouter(address _router) external onlyOwner {
		router = _router;
	}

	function setEthReward(address _ethReward) external onlyOwner {
		ethReward = _ethReward;
	}

	function setUsdcReward(address _usdcReward) external onlyOwner {
		usdcReward = _usdcReward;
	}

	function deposit(uint256 amount) external {

		require(amount > 0, "!amount");

		totalSupply += amount;
		IRewards(ethReward).updateRewardsApx(msg.sender, balances[msg.sender]);
		IRewards(usdcReward).updateRewardsApx(msg.sender, balances[msg.sender]);
		balances[msg.sender] += amount;

		IERC20(apx).safeTransferFrom(msg.sender, address(this), amount);

		emit DepositAPX(
			msg.sender,
			amount
		);

	}

	function withdraw(uint256 amount) external {
		
		require(amount > 0, "!amount");

		if (amount >= balances[msg.sender]) {
			amount = balances[msg.sender];
		}

		totalSupply -= amount;
		IRewards(ethReward).updateRewardsApx(msg.sender, balances[msg.sender]);
		IRewards(usdcReward).updateRewardsApx(msg.sender, balances[msg.sender]);
		balances[msg.sender] -= amount;

		IERC20(apx).safeTransfer(msg.sender, amount);

		emit WithdrawAPX(
			msg.sender,
			amount
		);

	}

	function getBalance(address account) external view returns(uint256) {
		return balances[account];
	}

	modifier onlyOwner() {
		require(msg.sender == owner, "!owner");
		_;
	}

}