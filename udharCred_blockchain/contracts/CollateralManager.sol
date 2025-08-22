// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
/**
 * @title CollateralManager
 * @author Keshav
 * @notice This contract handles the locking and settlement of ETH collateral.
 * Funds are held in escrow and can only be moved by the UdhaarChannel contract upon settlement.
 */

contract CollateralManager {
    mapping(address => uint256) public collateralBalances;
    address public udhaarChannelAddress;
    address public owner;

    event CollateralDeposited(address indexed customer, uint256 amount);
    event CollateralWithdrawn(address indexed customer, uint256 amount);
    event FundsSettled(address indexed customer, address indexed shopkeeper, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyUdhaarChannel() {
        require(msg.sender == udhaarChannelAddress, "Only UdhaarChannel contract can call this");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    function depositCollateral() public payable {
        require(msg.value > 0, "Deposit amount must be greater than zero");
        collateralBalances[msg.sender] += msg.value;
        emit CollateralDeposited(msg.sender, msg.value);
    }

    function withdrawCollateral(uint256 amount) public {
        require(amount <= collateralBalances[msg.sender], "Insufficient collateral");
        collateralBalances[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
        emit CollateralWithdrawn(msg.sender, amount);
    }

    function settleFunds(address customer, address shopkeeper, uint256 amountToShopkeeper) public onlyUdhaarChannel {
        uint256 customerBalance = collateralBalances[customer];
        require(amountToShopkeeper <= customerBalance, "Settlement amount exceeds collateral");

        if (amountToShopkeeper > 0) {
            payable(shopkeeper).transfer(amountToShopkeeper);
        }

        uint256 remainingCollateral = customerBalance - amountToShopkeeper;
        if (remainingCollateral > 0) {
             payable(customer).transfer(remainingCollateral);
        }
        
        collateralBalances[customer] = 0;
        emit FundsSettled(customer, shopkeeper, amountToShopkeeper);
    }

    function setUdhaarChannelAddress(address _channelAddress) public onlyOwner {
        require(udhaarChannelAddress == address(0), "Address already set");
        udhaarChannelAddress = _channelAddress;
    }
}

