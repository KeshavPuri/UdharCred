require("@nomicfoundation/hardhat-toolbox");

// Environment variables ko load karne ke liye yeh line add karein
require("dotenv").config(); 

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL, // Aapka Alchemy/Infura URL
      accounts: [process.env.PRIVATE_KEY] // Aapka MetaMask private key
    }
  }
};