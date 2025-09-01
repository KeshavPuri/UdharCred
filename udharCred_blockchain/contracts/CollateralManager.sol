// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


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

    // Customer is contract mein paisa daalta hai
    function depositCollateral() public payable {
        require(msg.value > 0, "Deposit amount must be greater than zero");
        collateralBalances[msg.sender] += msg.value;
        emit CollateralDeposited(msg.sender, msg.value);
    }

    // --- **UPDATED**: Ab yeh function sirf UdhaarChannel hi call kar sakta hai ---
    // Isse customer channel open hone ke baad direct paisa nahi nikaal paayega
    function withdrawCollateral(address customer, uint256 amount) public onlyUdhaarChannel {
        require(amount <= collateralBalances[customer], "Insufficient collateral");
        collateralBalances[customer] -= amount;
        payable(customer).transfer(amount);
        emit CollateralWithdrawn(customer, amount);
    }

    // Yeh function UdhaarChannel call karta hai jab udhaar settle hota hai
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