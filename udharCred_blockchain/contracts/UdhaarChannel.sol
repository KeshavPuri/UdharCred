// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CreditScore.sol";
import "./CollateralManager.sol";

contract UdhaarChannel {
    struct Channel {
        address shopkeeper;
        address customer;
        uint256 collateralLocked;
        bool isOpen;
        uint256 nonce;
        uint256 openingTimestamp;
    }

    mapping(bytes32 => Channel) public channels;

    CollateralManager public collateralManager;
    CreditScore public creditScore;
    
    uint256 public constant SETTLEMENT_PERIOD = 30 days;

    event ChannelOpened(bytes32 indexed channelId, address indexed shopkeeper, address indexed customer, uint256 collateralAmount);
    event ChannelClosed(bytes32 indexed channelId, uint256 finalBalance);
    event ChannelForceSettled(bytes32 indexed channelId, address indexed shopkeeper, address indexed customer);
    event UnusedCollateralWithdrawn(bytes32 indexed channelId, address indexed customer, uint256 amount);


    constructor(address _collateralManagerAddress, address _creditScoreAddress) {
        collateralManager = CollateralManager(_collateralManagerAddress);
        creditScore = CreditScore(_creditScoreAddress);
    }

    function openChannel(address customer, uint256 collateralAmount) public {
        address shopkeeper = msg.sender;
        bytes32 channelId = getChannelId(shopkeeper, customer);
        
        require(!channels[channelId].isOpen, "Channel already open");
        require(collateralManager.collateralBalances(customer) >= collateralAmount, "Insufficient collateral deposited");

        channels[channelId] = Channel({
            shopkeeper: shopkeeper,
            customer: customer,
            collateralLocked: collateralAmount,
            isOpen: true,
            nonce: 0,
            openingTimestamp: block.timestamp
        });

        emit ChannelOpened(channelId, shopkeeper, customer, collateralAmount);
    }

    function closeChannel(address customer, uint256 finalBalance, bytes calldata customerSignature) public {
        address shopkeeper = msg.sender;
        bytes32 channelId = getChannelId(shopkeeper, customer);
        Channel storage channel = channels[channelId];

        require(channel.isOpen, "Channel is not open");
        require(finalBalance <= channel.collateralLocked, "Final balance cannot exceed locked collateral");

        bytes32 messageHash = getSettlementHash(channelId, finalBalance, channel.nonce);
        address signer = recoverSigner(messageHash, customerSignature);
        require(signer == customer, "Invalid customer signature"); 

        channel.isOpen = false;
        channel.nonce++;

        collateralManager.settleFunds(customer, shopkeeper, finalBalance);

        uint256 utilizationBonus = _calculateUtilizationBonus(finalBalance, channel.collateralLocked);
        creditScore.recordSettlement(customer, finalBalance, utilizationBonus);

        emit ChannelClosed(channelId, finalBalance);
    }
    
    function forceSettle(address customer, uint256 finalBalance, bytes calldata customerSignature) public {
        address shopkeeper = msg.sender;
        bytes32 channelId = getChannelId(shopkeeper, customer);
        Channel storage channel = channels[channelId];

        require(channel.isOpen, "Channel is not open");
        require(channel.shopkeeper == shopkeeper, "Only the channel's shopkeeper can force settle");
        require(block.timestamp >= channel.openingTimestamp + SETTLEMENT_PERIOD, "Settlement period not over yet");

        bytes32 messageHash = getSettlementHash(channelId, finalBalance, channel.nonce);
        address signer = recoverSigner(messageHash, customerSignature);
        require(signer == customer, "Invalid customer signature for the provided balance");
        
        require(finalBalance <= channel.collateralLocked, "Final balance cannot exceed locked collateral");

        channel.isOpen = false;
        channel.nonce++;

        collateralManager.settleFunds(customer, shopkeeper, finalBalance);

        creditScore.recordDefault(customer);

        emit ChannelForceSettled(channelId, shopkeeper, customer);
    }
    
    function withdrawFromChannel(address shopkeeper, uint256 amountToWithdraw, uint256 currentDebt, bytes calldata customerSignature) public {
        address customer = msg.sender;
        bytes32 channelId = getChannelId(shopkeeper, customer);
        Channel storage channel = channels[channelId];
        
        require(channel.isOpen, "Channel is not open");
        
        bytes32 messageHash = getSettlementHash(channelId, currentDebt, channel.nonce);
        address signer = recoverSigner(messageHash, customerSignature);
        require(signer == customer, "Invalid customer signature");

        uint256 unusedCollateral = channel.collateralLocked - currentDebt;
        require(amountToWithdraw <= unusedCollateral, "Withdrawal amount exceeds unused collateral");

        channel.collateralLocked -= amountToWithdraw;
        channel.nonce++;

        collateralManager.withdrawCollateral(customer, amountToWithdraw);

        emit UnusedCollateralWithdrawn(channelId, customer, amountToWithdraw);
    }


    // --- UTILITY FUNCTIONS ---
    function getChannelId(address shopkeeper, address customer) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(shopkeeper, customer));
    }

    // **FIX**: Is function se special prefix hata diya gaya hai.
    // Ab yeh sirf data ka hash banayega.
    function getSettlementHash(bytes32 channelId, uint256 finalBalance, uint256 nonce) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(channelId, finalBalance, nonce));
    }

    // **FIX**: Yeh function ab hash banane se pehle prefix jodega.
    // Yeh Ethers.js ke `signMessage` ke saath 100% match karta hai.
    function recoverSigner(bytes32 dataHash, bytes memory signature) internal pure returns (address) {
        bytes32 prefixedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", dataHash));
        (bytes32 r, bytes32 s, uint8 v) = splitSignature(signature);
        return ecrecover(prefixedHash, v, r, s);
    }

    function splitSignature(bytes memory sig) internal pure returns (bytes32 r, bytes32 s, uint8 v) {
        require(sig.length == 65, "Invalid signature length");
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
    }
    
    function _calculateUtilizationBonus(uint256 balance, uint256 collateral) internal pure returns (uint256) {
        if (collateral == 0) return 0;
        uint256 utilizationRatio = (balance * 100) / collateral;
        if (utilizationRatio < 25) return 150;
        if (utilizationRatio < 50) return 100;
        if (utilizationRatio < 75 ) return 50;
        return 10;
    }
}