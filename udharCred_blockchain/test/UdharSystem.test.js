const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("UdhaarChannel Contract", function () {
    let CollateralManager, collateralManager;
    let CreditScore, creditScore;
    let UdhaarChannel, udhaarChannel;
    let owner, shopkeeper, customer, randomUser;

    // --- Setup: Har test se pehle saare contracts deploy karein ---
    beforeEach(async function () {
        [owner, shopkeeper, customer, randomUser] = await ethers.getSigners();

        // 1. CollateralManager deploy karein
        CollateralManager = await ethers.getContractFactory("CollateralManager");
        collateralManager = await CollateralManager.deploy();

        // 2. CreditScore deploy karein
        CreditScore = await ethers.getContractFactory("CreditScore");
        creditScore = await CreditScore.deploy();

        // 3. UdhaarChannel deploy karein aur use baaki do contracts ke address dein
        UdhaarChannel = await ethers.getContractFactory("UdhaarChannel");
        udhaarChannel = await UdhaarChannel.deploy(await collateralManager.getAddress(), await creditScore.getAddress());

        // 4. CollateralManager aur CreditScore ko batayein ki UdhaarChannel unse baat kar sakta hai
        await collateralManager.setUdhaarChannelAddress(await udhaarChannel.getAddress());
        await creditScore.setUdhaarChannelAddress(await udhaarChannel.getAddress());
    });

    // --- Helper function to create a signature ---
    async function createSignature(channelId, balance, nonce, signer) {
        const messageHash = ethers.keccak256(
            ethers.solidityPacked(
                ["bytes32", "uint256", "uint256"],
                [channelId, balance, nonce]
            )
        );
        const signature = await signer.signMessage(ethers.getBytes(messageHash));
        return signature;
    }


    // --- Test Case 1: Unused Collateral Withdraw Karna ---
    it("Should allow a customer to withdraw their unused collateral", async function () {
        await collateralManager.connect(customer).depositCollateral({ value: ethers.parseEther("1.0") });
        await udhaarChannel.connect(shopkeeper).openChannel(customer.address, ethers.parseEther("1.0"));
        
        const currentDebt = ethers.parseEther("0.3");
        const amountToWithdraw = ethers.parseEther("0.7");

        const channelId = await udhaarChannel.getChannelId(shopkeeper.address, customer.address);
        const channel = await udhaarChannel.channels(channelId);
        const signature = await createSignature(channelId, currentDebt, channel.nonce, customer);
        
        await expect(() => 
            udhaarChannel.connect(customer).withdrawFromChannel(shopkeeper.address, amountToWithdraw, currentDebt, signature)
        ).to.changeEtherBalance(customer, amountToWithdraw);

        const updatedChannel = await udhaarChannel.channels(channelId);
        expect(updatedChannel.collateralLocked).to.equal(currentDebt);
    });

    // --- Test Case 2: Shopkeeper Dwara Force Settle Karna ---
    it("Should allow a shopkeeper to force-settle a debt after 30 days", async function () {
        await collateralManager.connect(customer).depositCollateral({ value: ethers.parseEther("1.0") });
        await udhaarChannel.connect(shopkeeper).openChannel(customer.address, ethers.parseEther("1.0"));
        await time.increase(31 * 24 * 60 * 60);

        const finalBalance = ethers.parseEther("0.6");
        
        const channelId = await udhaarChannel.getChannelId(shopkeeper.address, customer.address);
        const channel = await udhaarChannel.channels(channelId);
        const signature = await createSignature(channelId, finalBalance, channel.nonce, customer);

        const refundAmount = ethers.parseEther("0.4");
        
        await expect(() => 
            udhaarChannel.connect(shopkeeper).forceSettle(customer.address, finalBalance, signature)
        ).to.changeEtherBalances([shopkeeper, customer], [finalBalance, refundAmount]);

        const updatedChannel = await udhaarChannel.channels(channelId);
        expect(updatedChannel.isOpen).to.be.false;
    });

    // --- Edge Case Tests (Failure Scenarios) ---

    it("Should REVERT if a customer tries to withdraw more than their unused collateral", async function () {
        await collateralManager.connect(customer).depositCollateral({ value: ethers.parseEther("1.0") });
        await udhaarChannel.connect(shopkeeper).openChannel(customer.address, ethers.parseEther("1.0"));
        
        const currentDebt = ethers.parseEther("0.3"); // Unused collateral is 0.7 ETH
        const amountToWithdraw = ethers.parseEther("0.8"); // Trying to withdraw more

        const channelId = await udhaarChannel.getChannelId(shopkeeper.address, customer.address);
        const channel = await udhaarChannel.channels(channelId);
        const signature = await createSignature(channelId, currentDebt, channel.nonce, customer);
        
        await expect(
            udhaarChannel.connect(customer).withdrawFromChannel(shopkeeper.address, amountToWithdraw, currentDebt, signature)
        ).to.be.revertedWith("Withdrawal amount exceeds unused collateral");
    });

    it("Should REVERT if a shopkeeper tries to force-settle before 30 days", async function () {
        await collateralManager.connect(customer).depositCollateral({ value: ethers.parseEther("1.0") });
        await udhaarChannel.connect(shopkeeper).openChannel(customer.address, ethers.parseEther("1.0"));
        await time.increase(29 * 24 * 60 * 60);

        const finalBalance = ethers.parseEther("0.6");
        const channelId = await udhaarChannel.getChannelId(shopkeeper.address, customer.address);
        const channel = await udhaarChannel.channels(channelId);
        const signature = await createSignature(channelId, finalBalance, channel.nonce, customer);

        await expect(
            udhaarChannel.connect(shopkeeper).forceSettle(customer.address, finalBalance, signature)
        ).to.be.revertedWith("Settlement period not over yet");
    });

    it("Should REVERT forceSettle if the signature is for a different balance", async function () {
        await collateralManager.connect(customer).depositCollateral({ value: ethers.parseEther("1.0") });
        await udhaarChannel.connect(shopkeeper).openChannel(customer.address, ethers.parseEther("1.0"));
        await time.increase(31 * 24 * 60 * 60);

        const correctFinalBalance = ethers.parseEther("0.6");
        const incorrectBalanceForSignature = ethers.parseEther("0.5");

        const channelId = await udhaarChannel.getChannelId(shopkeeper.address, customer.address);
        const channel = await udhaarChannel.channels(channelId);
        const signature = await createSignature(channelId, incorrectBalanceForSignature, channel.nonce, customer);

        await expect(
            udhaarChannel.connect(shopkeeper).forceSettle(customer.address, correctFinalBalance, signature)
        ).to.be.revertedWith("Invalid customer signature for the provided balance");
    });

    // --- **NEW**: Extreme Level Edge Case Tests ---

    it("Should REVERT a replay attack where an old signature is used", async function () {
        await collateralManager.connect(customer).depositCollateral({ value: ethers.parseEther("1.0") });
        await udhaarChannel.connect(shopkeeper).openChannel(customer.address, ethers.parseEther("1.0"));
        
        // First, a valid withdrawal of 0.2 ETH occurs
        const firstDebt = ethers.parseEther("0.3");
        const firstWithdraw = ethers.parseEther("0.2");
        let channelId = await udhaarChannel.getChannelId(shopkeeper.address, customer.address);
        let channel = await udhaarChannel.channels(channelId);
        const firstSignature = await createSignature(channelId, firstDebt, channel.nonce, customer);
        await udhaarChannel.connect(customer).withdrawFromChannel(shopkeeper.address, firstWithdraw, firstDebt, signature);

        // Now, the nonce has increased. Trying to use the OLD signature again should fail.
        await expect(
            udhaarChannel.connect(customer).withdrawFromChannel(shopkeeper.address, firstWithdraw, firstDebt, firstSignature)
        ).to.be.revertedWith("Invalid customer signature");
    });

    it("Should REVERT if the signature is from the wrong person (e.g., shopkeeper)", async function () {
        await collateralManager.connect(customer).depositCollateral({ value: ethers.parseEther("1.0") });
        await udhaarChannel.connect(shopkeeper).openChannel(customer.address, ethers.parseEther("1.0"));
        
        const finalBalance = ethers.parseEther("0.6");
        const channelId = await udhaarChannel.getChannelId(shopkeeper.address, customer.address);
        const channel = await udhaarChannel.channels(channelId);
        
        // **WRONG SIGNER**: The shopkeeper signs instead of the customer
        const maliciousSignature = await createSignature(channelId, finalBalance, channel.nonce, shopkeeper);

        await expect(
            udhaarChannel.connect(shopkeeper).closeChannel(customer.address, finalBalance, maliciousSignature)
        ).to.be.revertedWith("Invalid customer signature");
    });

    it("Should REVERT any action on an already closed channel", async function () {
        await collateralManager.connect(customer).depositCollateral({ value: ethers.parseEther("1.0") });
        await udhaarChannel.connect(shopkeeper).openChannel(customer.address, ethers.parseEther("1.0"));

        // First, close the channel successfully
        const finalBalance = ethers.parseEther("0.8");
        const channelId = await udhaarChannel.getChannelId(shopkeeper.address, customer.address);
        let channel = await udhaarChannel.channels(channelId);
        const signature = await createSignature(channelId, finalBalance, channel.nonce, customer);
        await udhaarChannel.connect(shopkeeper).closeChannel(customer.address, finalBalance, signature);

        // Now, try to close it again
        await expect(
            udhaarChannel.connect(shopkeeper).closeChannel(customer.address, finalBalance, signature)
        ).to.be.revertedWith("Channel is not open");
    });
});

