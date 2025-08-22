const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

// Test suite for the entire final Udhaar system
describe("Final UdhaarChannel System", function () {
    let collateralManager, creditScore, udhaarChannel;
    let owner, shopkeeper, customer, anotherCustomer;

    // This function runs before each test to set up the environment
    beforeEach(async function () {
        // Get test accounts from Hardhat
        [owner, shopkeeper, customer, anotherCustomer] = await ethers.getSigners();

        // Deploy CollateralManager
        const CollateralManagerFactory = await ethers.getContractFactory("CollateralManager");
        collateralManager = await CollateralManagerFactory.deploy();
        
        // Deploy CreditScore
        const CreditScoreFactory = await ethers.getContractFactory("CreditScore");
        creditScore = await CreditScoreFactory.deploy();

        // Deploy the main UdhaarChannel contract, linking the other two
        const UdhaarChannelFactory = await ethers.getContractFactory("UdhaarChannel");
        udhaarChannel = await UdhaarChannelFactory.deploy(
            await collateralManager.getAddress(),
            await creditScore.getAddress()
        );

        // Grant permissions by setting the UdhaarChannel address in the helper contracts
        await collateralManager.connect(owner).setUdhaarChannelAddress(await udhaarChannel.getAddress());
        await creditScore.connect(owner).setUdhaarChannelAddress(await udhaarChannel.getAddress());
    });

    // Test Case 1: The ideal scenario where the customer pays on time
    describe("Happy Path: Normal Settlement", function () {
        it("should allow a full cycle: deposit -> open -> close -> settle -> score update", async function () {
            // Arrange
            const collateralAmount = ethers.parseEther("1.0");
            const finalBalance = ethers.parseEther("0.5");

            // Act
            await collateralManager.connect(customer).depositCollateral({ value: collateralAmount });
            await udhaarChannel.connect(shopkeeper).openChannel(customer.address, collateralAmount);
            const channelId = await udhaarChannel.getChannelId(shopkeeper.address, customer.address);
            const channel = await udhaarChannel.channels(channelId);

            const innerMessageHash = ethers.solidityPackedKeccak256(
                ["bytes32", "uint256", "uint256"],
                [channelId, finalBalance, channel.nonce]
            );
            const customerSignature = await customer.signMessage(ethers.getBytes(innerMessageHash));

            const shopkeeperInitialBalance = await ethers.provider.getBalance(shopkeeper.address);
            const tx = await udhaarChannel.connect(shopkeeper).closeChannel(customer.address, finalBalance, customerSignature);
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;

            // Assert
            const shopkeeperFinalBalance = await ethers.provider.getBalance(shopkeeper.address);
            expect(shopkeeperFinalBalance).to.equal(shopkeeperInitialBalance + finalBalance - gasUsed);
            
            const newScore = await creditScore.getScore(customer.address);
            expect(newScore).to.be.gt(300);
            console.log(`      ✅ Normal Settlement Score: ${newScore}`);
        });
    });

    // Test Case 2: The scenario where the customer defaults and the shopkeeper force-settles
    describe("Unhappy Path: Secure Forced Settlement", function () {
        it("should allow shopkeeper to force-settle with proof after 30 days", async function () {
            // Arrange
            const collateralAmount = ethers.parseEther("2.0");
            const actualUdhaar = ethers.parseEther("0.8");

            await collateralManager.connect(customer).depositCollateral({ value: collateralAmount });
            await udhaarChannel.connect(shopkeeper).openChannel(customer.address, collateralAmount);
            const channelId = await udhaarChannel.getChannelId(shopkeeper.address, customer.address);
            const channel = await udhaarChannel.channels(channelId);

            const innerMessageHash = ethers.solidityPackedKeccak256(
                ["bytes32", "uint256", "uint256"],
                [channelId, actualUdhaar, channel.nonce]
            );
            const customerSignature = await customer.signMessage(ethers.getBytes(innerMessageHash));

            // Act
            await time.increase(30 * 24 * 60 * 60);

            const shopkeeperInitialBalance = await ethers.provider.getBalance(shopkeeper.address);
            const customerInitialBalance = await ethers.provider.getBalance(customer.address);
            
            const tx = await udhaarChannel.connect(shopkeeper).forceSettle(customer.address, actualUdhaar, customerSignature);
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;

            // Assert
            const shopkeeperFinalBalance = await ethers.provider.getBalance(shopkeeper.address);
            expect(shopkeeperFinalBalance).to.equal(shopkeeperInitialBalance + actualUdhaar - gasUsed);

            const customerFinalBalance = await ethers.provider.getBalance(customer.address);
            const remainingCollateral = collateralAmount - actualUdhaar;
            expect(customerFinalBalance).to.equal(customerInitialBalance + remainingCollateral);

            const newScore = await creditScore.getScore(customer.address);
            const profile = await creditScore.customerProfiles(customer.address);
            expect(profile.totalDefaults).to.equal(1);
            expect(newScore).to.equal(300);
            console.log(`      ✅ Forced Settlement Penalized Score: ${newScore}`);
        });

        it("should NOT allow force-settle if the signature is for a different amount", async function () {
            // Arrange
            const collateralAmount = ethers.parseEther("2.0");
            const actualUdhaar = ethers.parseEther("0.8");
            const fraudulentUdhaar = ethers.parseEther("1.5");

            await collateralManager.connect(customer).depositCollateral({ value: collateralAmount });
            await udhaarChannel.connect(shopkeeper).openChannel(customer.address, collateralAmount);
            const channelId = await udhaarChannel.getChannelId(shopkeeper.address, customer.address);
            const channel = await udhaarChannel.channels(channelId);
            
            const innerMessageHash = ethers.solidityPackedKeccak256(
                ["bytes32", "uint256", "uint256"],
                [channelId, actualUdhaar, channel.nonce]
            );
            const customerSignature = await customer.signMessage(ethers.getBytes(innerMessageHash));

            // Act & Assert
            await time.increase(30 * 24 * 60 * 60);
            
            await expect(
                udhaarChannel.connect(shopkeeper).forceSettle(customer.address, fraudulentUdhaar, customerSignature)
            ).to.be.revertedWith("Invalid customer signature for the provided balance");
        });
    });

    // Test Case 3: Covering specific edge cases for 100% coverage
    describe("Edge Case Coverage", function() {
        it("should allow a user to withdraw their collateral if no channel is open", async function() {
            // Covers CollateralManager.withdrawCollateral
            const depositAmount = ethers.parseEther("1.0");
            await collateralManager.connect(customer).depositCollateral({ value: depositAmount });
            
            const initialBalance = await ethers.provider.getBalance(customer.address);
            const tx = await collateralManager.connect(customer).withdrawCollateral(depositAmount);
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;

            const finalBalance = await ethers.provider.getBalance(customer.address);
            expect(finalBalance).to.equal(initialBalance + depositAmount - gasUsed);
        });

        it("should cap the credit score at 900", async function() {
            // Covers the score capping logic in CreditScore.sol
            const collateralAmount = ethers.parseEther("1.0");
            const settlementAmount = ethers.parseEther("0.1");

            // Simulate 50 settlements to generate a high score
            for (let i = 0; i < 50; i++) {
                await collateralManager.connect(anotherCustomer).depositCollateral({ value: collateralAmount });
                await udhaarChannel.connect(shopkeeper).openChannel(anotherCustomer.address, collateralAmount);
                
                const channelId = await udhaarChannel.getChannelId(shopkeeper.address, anotherCustomer.address);
                const channel = await udhaarChannel.channels(channelId);
                
                const innerMessageHash = ethers.solidityPackedKeccak256(
                    ["bytes32", "uint256", "uint256"],
                    [channelId, settlementAmount, channel.nonce]
                );
                const signature = await anotherCustomer.signMessage(ethers.getBytes(innerMessageHash));
                
                await udhaarChannel.connect(shopkeeper).closeChannel(anotherCustomer.address, settlementAmount, signature);
            }

            const score = await creditScore.getScore(anotherCustomer.address);
            expect(score).to.equal(900);
            console.log(`      ✅ Score Capping Test: Final score is ${score}`);
        });

        it("should handle various collateral utilization ratios correctly", async function() {
            // Covers all branches of _calculateUtilizationBonus in UdhaarChannel.sol
            
            // Test Case A: Low utilization (< 25%) -> 150 points
            let collateral = ethers.parseEther("10.0");
            let balance = ethers.parseEther("2.0"); // 20%
            await collateralManager.connect(customer).depositCollateral({ value: collateral });
            await udhaarChannel.connect(shopkeeper).openChannel(customer.address, collateral);
            let channelId = await udhaarChannel.getChannelId(shopkeeper.address, customer.address);
            let channel = await udhaarChannel.channels(channelId);
            let hash = ethers.solidityPackedKeccak256(["bytes32", "uint256", "uint256"], [channelId, balance, channel.nonce]);
            let sig = await customer.signMessage(ethers.getBytes(hash));
            await udhaarChannel.connect(shopkeeper).closeChannel(customer.address, balance, sig);
            let score = await creditScore.getScore(customer.address);
            // 300 (base) + 20 (settlement) + 50 (volume) + 150 (bonus) = 520
            expect(score).to.equal(520);

            // Test Case B: High utilization (> 75%) -> 10 points
            balance = ethers.parseEther("8.0"); // 80%
            await collateralManager.connect(customer).depositCollateral({ value: collateral });
            await udhaarChannel.connect(shopkeeper).openChannel(customer.address, collateral);
            channelId = await udhaarChannel.getChannelId(shopkeeper.address, customer.address);
            channel = await udhaarChannel.channels(channelId);
            hash = ethers.solidityPackedKeccak256(["bytes32", "uint256", "uint256"], [channelId, balance, channel.nonce]);
            sig = await customer.signMessage(ethers.getBytes(hash));
            await udhaarChannel.connect(shopkeeper).closeChannel(customer.address, balance, sig);
            // Previous score was 520. Now it's a new profile.
            // 300 (base) + 20 (settlement) + 200 (volume) + 10 (bonus) = 530
            score = await creditScore.getScore(customer.address);
            expect(score).to.equal(530);
        });
    });
});