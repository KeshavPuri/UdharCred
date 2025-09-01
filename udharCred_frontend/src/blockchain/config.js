

export const COLLATERAL_MANAGER_ADDRESS = "0x55d07fE1067729b073cDDb62975D321e0D774910";

export const COLLATERAL_MANAGER_ABI = [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "customer",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "CollateralDeposited",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "customer",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "CollateralWithdrawn",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "customer",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "shopkeeper",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "FundsSettled",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "collateralBalances",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "depositCollateral",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_channelAddress",
          "type": "address"
        }
      ],
      "name": "setUdhaarChannelAddress",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "customer",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "shopkeeper",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amountToShopkeeper",
          "type": "uint256"
        }
      ],
      "name": "settleFunds",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "udhaarChannelAddress",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "customer",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "withdrawCollateral",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ]


  export const UDHAAR_CHANNEL_ADDRESS = "0xd27F2fe6E47A80881C86068DD83b44ba9cB11947";
export const UDHAAR_CHANNEL_ABI =  [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_collateralManagerAddress",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_creditScoreAddress",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "channelId",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "finalBalance",
          "type": "uint256"
        }
      ],
      "name": "ChannelClosed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "channelId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "shopkeeper",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "customer",
          "type": "address"
        }
      ],
      "name": "ChannelForceSettled",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "channelId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "shopkeeper",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "customer",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "collateralAmount",
          "type": "uint256"
        }
      ],
      "name": "ChannelOpened",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "channelId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "customer",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "UnusedCollateralWithdrawn",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "SETTLEMENT_PERIOD",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "channels",
      "outputs": [
        {
          "internalType": "address",
          "name": "shopkeeper",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "customer",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "collateralLocked",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "isOpen",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "nonce",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "openingTimestamp",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "customer",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "finalBalance",
          "type": "uint256"
        },
        {
          "internalType": "bytes",
          "name": "customerSignature",
          "type": "bytes"
        }
      ],
      "name": "closeChannel",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "collateralManager",
      "outputs": [
        {
          "internalType": "contract CollateralManager",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "creditScore",
      "outputs": [
        {
          "internalType": "contract CreditScore",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "customer",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "finalBalance",
          "type": "uint256"
        },
        {
          "internalType": "bytes",
          "name": "customerSignature",
          "type": "bytes"
        }
      ],
      "name": "forceSettle",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "shopkeeper",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "customer",
          "type": "address"
        }
      ],
      "name": "getChannelId",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "pure",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "channelId",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "finalBalance",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "nonce",
          "type": "uint256"
        }
      ],
      "name": "getSettlementHash",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "pure",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "customer",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "collateralAmount",
          "type": "uint256"
        }
      ],
      "name": "openChannel",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "shopkeeper",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amountToWithdraw",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "currentDebt",
          "type": "uint256"
        },
        {
          "internalType": "bytes",
          "name": "customerSignature",
          "type": "bytes"
        }
      ],
      "name": "withdrawFromChannel",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ];


export const CREDIT_SCORE_ADDRESS = "0x2bF94A55f1743084da6F4418688E719C4F231Cf0";
export const CREDIT_SCORE_ABI = [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "customer",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "newScore",
          "type": "uint256"
        }
      ],
      "name": "DefaultRecorded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "customer",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "newScore",
          "type": "uint256"
        }
      ],
      "name": "ScoreUpdated",
      "type": "event"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "customerProfiles",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "totalSettlements",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "totalVolumeSettled",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "totalDefaults",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "score",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "customer",
          "type": "address"
        }
      ],
      "name": "getScore",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "customer",
          "type": "address"
        }
      ],
      "name": "recordDefault",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "customer",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "settledAmount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "collateralUtilizationPoints",
          "type": "uint256"
        }
      ],
      "name": "recordSettlement",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_channelAddress",
          "type": "address"
        }
      ],
      "name": "setUdhaarChannelAddress",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "udhaarChannelAddress",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ];
