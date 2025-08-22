// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// =================================================================================
// Contract 1: CreditScore.sol
// Yeh contract customer ka credit score manage karta hai.
// =================================================================================

/**
 * @title CreditScore
 * @author Keshav
 * @notice This contract autonomously calculates and stores customer credit scores.
 * The score is calculated based on on-chain transaction history and penalties for defaults.
 */

contract CreditScore {
    // --- State Variables ---

    address public udhaarChannelAddress;
    address public owner; // The deployer of the contract.

    struct CustomerProfile {
        uint256 totalSettlements;
        uint256 totalVolumeSettled;
        uint256 totalDefaults;
        uint256 score;
    }

    mapping(address => CustomerProfile) public customerProfiles;

    event ScoreUpdated(address indexed customer, uint256 newScore);
    event DefaultRecorded(address indexed customer, uint256 newScore);

    // --- Constructor & Modifiers ---

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    modifier onlyUdhaarChannel() {
        require(msg.sender == udhaarChannelAddress, "Only UdhaarChannel can call this");
        _;
    }

    // --- Core Logic ---

    function setUdhaarChannelAddress(address _channelAddress) public onlyOwner {
        require(udhaarChannelAddress == address(0), "Address already set");
        udhaarChannelAddress = _channelAddress;
    }

    function recordSettlement(
        address customer,
        uint256 settledAmount,
        uint256 collateralUtilizationPoints
    ) public onlyUdhaarChannel {
        CustomerProfile storage profile = customerProfiles[customer];
        profile.totalSettlements++;
        profile.totalVolumeSettled += settledAmount;
        _recalculateScore(customer, collateralUtilizationPoints);
    }

    function recordDefault(address customer) public onlyUdhaarChannel {
        CustomerProfile storage profile = customerProfiles[customer];
        profile.totalDefaults++;

        uint256 currentScore = getScore(customer);
        uint256 penalty = (currentScore * 40) / 100;
        uint256 newScore = currentScore - penalty;

        if (newScore < 300) {
            newScore = 300;
        }

        profile.score = newScore;
        emit DefaultRecorded(customer, newScore);
    }

    function _recalculateScore(address customer, uint256 utilizationBonus) internal {
        CustomerProfile storage profile = customerProfiles[customer];
        
        uint256 baseScore = 300;

        uint256 settlementPoints = profile.totalSettlements * 20;
        if (settlementPoints > 200) {
            settlementPoints = 200;
        }

        uint256 volumePoints = (profile.totalVolumeSettled / 1 ether) * 25;
        if (volumePoints > 250) {
            volumePoints = 250;
        }

        if (utilizationBonus > 150) {
            utilizationBonus = 150;
        }

        uint256 newScore = baseScore + settlementPoints + volumePoints + utilizationBonus;

        if (newScore > 900) {
            newScore = 900;
        }

        profile.score = newScore;
        emit ScoreUpdated(customer, newScore);
    }

    // --- View Functions ---

    function getScore(address customer) public view returns (uint256) {
        uint256 score = customerProfiles[customer].score;
        return score == 0 ? 300 : score;
    }
}

