// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that,
// Hardhat will compile your contracts, add the Hardhat Runtime Environment's
// members to the global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  // Get the account that will be deploying the contracts
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // --- 1. Deploy CollateralManager ---
  console.log("Deploying CollateralManager...");
  const CollateralManager = await hre.ethers.getContractFactory("CollateralManager");
  const collateralManager = await CollateralManager.deploy();
  await collateralManager.waitForDeployment();
  const collateralManagerAddress = await collateralManager.getAddress();
  console.log(`CollateralManager deployed to: ${collateralManagerAddress}`);

  // --- 2. Deploy CreditScore ---
  console.log("\nDeploying CreditScore...");
  const CreditScore = await hre.ethers.getContractFactory("CreditScore");
  const creditScore = await CreditScore.deploy();
  await creditScore.waitForDeployment();
  const creditScoreAddress = await creditScore.getAddress();
  console.log(`CreditScore deployed to: ${creditScoreAddress}`);

  // --- 3. Deploy UdhaarChannel (and link the other two) ---
  console.log("\nDeploying UdhaarChannel...");
  const UdhaarChannel = await hre.ethers.getContractFactory("UdhaarChannel");
  const udhaarChannel = await UdhaarChannel.deploy(
    collateralManagerAddress,
    creditScoreAddress
  );
  await udhaarChannel.waitForDeployment();
  const udhaarChannelAddress = await udhaarChannel.getAddress();
  console.log(`UdhaarChannel deployed to: ${udhaarChannelAddress}`);

  // --- 4. Post-Deployment Configuration: Granting Permissions ---
  console.log("\nConfiguring contract permissions...");

  // Set the UdhaarChannel address in CollateralManager
  const tx1 = await collateralManager.setUdhaarChannelAddress(udhaarChannelAddress);
  await tx1.wait();
  console.log(" -> Set UdhaarChannel address in CollateralManager");

  // Set the UdhaarChannel address in CreditScore
  const tx2 = await creditScore.setUdhaarChannelAddress(udhaarChannelAddress);
  await tx2.wait();
  console.log(" -> Set UdhaarChannel address in CreditScore");

  console.log("\n✅ Deployment and configuration complete!");
  console.log("=========================================");
  console.log("CollateralManager Address:", collateralManagerAddress);
  console.log("CreditScore Address:    ", creditScoreAddress);
  console.log("UdhaarChannel Address:  ", udhaarChannelAddress);
  console.log("=========================================");
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});