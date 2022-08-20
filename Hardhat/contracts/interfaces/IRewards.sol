// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IRewards {
    function updateRewards(address account) external;

    function notifyRewardReceived(uint256 amount) external;

    function adminAirdrop(uint256 amount) external;

    function updateRewardsApx(address account, uint256 amount) external;
}
