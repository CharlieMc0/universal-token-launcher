/**
 * This file contains the compiled bytecode and ABIs for Universal Token contracts.
 * In production, these should be compiled from the standard-contracts repository.
 */

/**
 * IMPORTANT PRODUCTION NOTE:
 * 
 * For a production deployment, you should:
 * 1. Compile the standard-contracts directly using Hardhat
 * 2. Extract the correct artifacts (ABIs and bytecode) for:
 *    - ZetaChainUniversalToken
 *    - EVMUniversalToken
 * 3. Use separate ABI files for readability
 * 
 * The current placeholders are for development only!
 */

// Re-export the old bytecode for compatibility until the implementation is properly updated
exports.UNIVERSAL_TOKEN_BYTECODE = '0x60806040523480156200001157600080fd5b50336e0c3f3fa0ac00a6aaa7c0b90aecf49ff6101556200003a33620000b260201b60201c565b600580546001600160a01b0319166e0c3f3fa0ac00a6aaa7c0b90aecf49ff17905562000065336200012260201b60201c565b620000a97f9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6330604051620000988291906200023c565b60405180910390a2620003f6565b600580546001600160a01b038381166001600160a01b0319831681179093556040519116919082907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e090600090a35050565b6200013d8160006200018260201b620011571790919060201c565b6040516001600160a01b038216907f6719d08c1888103bea251a4ed56406bd0c3e69723c8a1686e017e7bbe159b6f890600090a250565b6001600160a01b03821662000198575050565b6001600160a01b03821660008181526001602090815260408083208054336001600160a01b031991821681179092559484526002835281842080549093168117909255600383528184208590556004909252909120805460ff1916909117905550565b80516001600160a01b03811681146200020f57600080fd5b919050565b600080604083850312156200022857600080fd5b6200023383620001f7565b946020939093013593505050565b6001600160a01b03928316815291166020820152604081019190915260600190565b61332f80620004066000396000f3fe608060405234801561001057600080fd5b50600436106102fb5760003560e01c806392bda0b21161019d578063c1ef1a131161010f578063decad5ab116100ad578063ef6eff3911610087578063ef6eff3914610827578063f2c5ade314610837578063f2cb66371461084a578063f2fde38b1461085d578063f654d8e31461087057600080fd5b8063decad5ab146107e1578063dff6c628146107f4578063eb0c848214610807578063eb8d2c3f1461081457600080fd5b8063d3cae4fe11610de9578063d3cae4fe14610775578063d4ee1d9014610788578063d6a3b9fc1461079b578063dd62ed3e146107ae578063ddf252ad146107c857600080fd5b8063c1ef1a13146106e4578063c49827071461070c578063c5b350df1461071f578063d02ff9af1461073257600080fd5b8063a457c2d711610167578063b17af10611610141578063b17af106146106a8578063b2bdfa7b146106bb578063b6b4f86e146106ce578063bc6a6fa4146106d157600080fd5b8063a457c2d71461066c578063a9059cbb1461067f578063aaf389cf14610692578063b16a19de1461069a57600080fd5b806392bda0b214610608578063932c7d17146106185780639458150b1461062b57806395d89b411461063e578063982fb9d9146106465780639c52a7f11461065957600080fd5b8063439f3d701161026b5780636ff97f1d116102245780638456cb5911610209578063845c893d146105c55780638520893c146105d85780638da5cb5b146105eb5780638e539e8c146105fe57600080fd5b80636ff97f1d1461057e57806370a08231146105915780637ecebe00146105a557600080fd5b8063584ea94d1161025a578063584ea94d1461053057806367fbd289146105435780636de7148c146105565780636e296e451461056957600080fd5b8063439f3d70146104e3578063521c1f0a146104f657806354fd4d501461050d57600080fd5b80632f2ff15d116102c35780633644e5151161029d5780633644e51514610483578063395093511461048c57806340c10f191461049f57806342966c68146104b257600080fd5b80632f2ff15d1461041c5780633092afd51461042f578063313ce5671461044257600080fd5b806301ffc9a7146103005780630a5440c8146103315780631864bbc91461035857806318160ddd1461036b57806321e5627d146103815780632e4176cf146103f7575b600080fd5b61031a61030e366004612d65565b610883565b60405190151581526020015b60405180910390f35b6103446103403660046129bc565b6108b4565b60405173ffffffffffffffffffffffffffffffffffffffff9091168152602001610328565b61036b610366366004612b9f565b61098e565b005b6006545b604051908152602001610328565b61031a61038f366004612a20565b73ffffffffffffffffffffffffffffffffffffffff8181166000908152600283526040902054169173ffffffffffffffffffffffffffffffffffffffff831615919091149392505050565b6009546103449073ffffffffffffffffffffffffffffffffffffffff1681565b61036b61042a366004612a20565b610a20565b61036b61043d366004612a20565b610a4a565b60405160128152602001610328565b61036b610477366004612a49565b610a73565b600054610369565b61031a61049a366004612a20565b610a9c565b61036b6104ad366004612b05565b610ab6565b6103696104c03660046129a3565b73ffffffffffffffffffffffffffffffffffffffff1660009081526020819052604090205490565b61036b6104f1366004612a95565b610b3c565b6103696105043660046129a3565b610c3f565b61051560d081565b6040516103289190612ec7565b61036b61053e3660046129bc565b610c59565b610344600580546001600160a01b031690565b61036b610564366004612d3e565b610d01565b6103696105773660046129a3565b610d3c565b61031a60095460ff1681565b61036961059f3660046129a3565b610d65565b6103696105b33660046129a3565b60046020526000908152604090205481565b61036b6105d33660046129bc565b610dee565b61036b6105e6366004612bdd565b610e7f565b600560009054906101000a900473ffffffffffffffffffffffffffffffffffffffff16610344565b61036b610f3c565b61036b610613366004612db2565b610fc9565b61036b610626366004612a20565b611099565b61031a610639366004612a49565b6110c3565b61051561109a565b600954610369906901000000000000000000900460ff1681565b61036b610667366004612a20565b6110a9565b61031a61067a366004612a20565b6110da565b61031a61068d366004612a20565b611124565b610369600e5481565b61031a60095462010000900460ff1681565b61036b6106b6366004612a20565b61113a565b610344600c546001600160a01b031681565b61031a611164565b600954610369907001000000000000000000000000000000900460ff1681565b61036b6106f23660046129a3565b600a80547fffff00000000000000000000000000000000000000000000000000000000000016600190811790915590565b61036b61071a3660046129a3565b611174565b61036b61072d366004612a20565b6111a0565b61075761074036600461293f565b73ffffffffffffffffffffffffffffffffffffffff91909116600090815260036020526040902054151590565b6040519015158152602001610328565b61036b6107833660046129bc565b6111d0565b600b546103449073ffffffffffffffffffffffffffffffffffffffff1681565b61036b6107a9366004612a20565b61127a565b6103696107bc366004612998565b6112a4565b6103696107d63660046129f6565b6112ca565b61036b6107ef366004612a20565b6114a5565b61036b6108023660046129a356b60007fffffffff0000000000000000000000000000000000000000000000000000000082167f01ffc9a700000000000000000000000000000000000000000000000000000000148061091757507fffffffff0000000000000000000000000000000000000000000000000000000082167f80ac58cd00000000000000000000000000000000000000000000000000000000145b806108ae57507f5b5e139f00000000000000000000000000000000000000000000000000000000007fffffffff000000000000000000000000000000000000000000000000000000008316145b92915050565b6000610950827fc89f7451330040e8b6b9ba5972c9a2520ce5f34d7325b02aedbfc5845c74bfc86000546109396108356040518060200160405280600081525090565b846040516020016109a693929190612e04565b604051602081830303815290604052805190602001206117a96020840201610783565b600a5473ffffffffffffffffffffffffffffffffffffffff821660009081526003602052604090205460ff91821615611766576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600860248201527f5245564552544544000000000000000000000000000000000000000000000000604482015260640b5f80fd5b7f9016f451fa53a3c48a34e4be41c36c6077db68b91e5b5f65e52a57789c60099600081905560408051918252602082018190527fdf42adac25a0597b7a64295b6d75e68db6dd94e67b2a4f9cf5afcd7e027dcf9e910160405180910390a150565b610a28611164565b610a46848484611801565b50505050565b610a52611164565b610a6f81607860408051602081019091526000815261180e565b50565b610a7b611164565b610a97838360ff16611851565b505050565b6000610aba826000546108356000546112ca565b5090565b610abe611164565b60095460ff16610b0b576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600b60248201527f5441424c455f5041555345440000000000000000000000000000000000000000604482015260640b5f80fd5b610b36838380600060010160408051602081019091526000815261180e565b505050565b610b44611164565b8273ffffffffffffffffffffffffffffffffffffffff168473ffffffffffffffffffffffffffffffffffffffff1603610baf576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610ba690612e78565b60405180910390fd5b80610bc557610bc4848483611967565b5b73ffffffffffffffffffffffffffffffffffffffff831615610c1157610bf1848473ffffffffffffffffffffffffffffffffffffffff16611a92565b610c10848473ffffffffffffffffffffffffffffffffffffffff16611c7d565b5b73ffffffffffffffffffffffffffffffffffffffff821615610c3857610c11838373ffffffffffffffffffffffffffffffffffffffff16611a92565b505050505050565b73ffffffffffffffffffffffffffffffffffffffff166000908152600d602052604090205490565b610c61611164565b6009546040517f01ffc9a70000000000000000000000000000000000000000000000000000000081527fffffffff00000000000000000000000000000000000000000000000000000000821660048201527f0d125e890e3d47c63442c1842a9742901860c55e0b5390795215fd905882a33c9073ffffffffffffffffffffffffffffffffffffffff16906301ffc9a790602401602060405180830381865afa15610d06578182fd5b505050506040513d601f19601f82011682018060405250810190610d2a9190612eff565b610cc7576001609c60005b600080fd5b600a805475ff0000000000000000000000000000000000000000000000191674010000000000000000000000000000000000000000179055565b73ffffffffffffffffffffffffffffffffffffffff166000908152600e602052604090205490565b600073ffffffffffffffffffffffffffffffffffffffff821615610de557610de5826004610d9560408051602081019091526000815290565b604051602001610da793929190612e04565b60405160208183030381529060405280519060200120611d7e9060208101906001600160e01b031982169061276f565b6109849082611e03565b610df6611164565b6009546040517f01ffc9a70000000000000000000000000000000000000000000000000000000081527fffffffff00000000000000000000000000000000000000000000000000000000821660048201527f67bcee517c49b655d2f1ec3d7fbfcd3a8a70fb72e0867577e61d0bac4fe49c069073ffffffffffffffffffffffffffffffffffffffff16906301ffc9a790602401602060405180830381865afa158015610e94573d6000803e3d6000fd5b505050506040513d601f19601f82011682018060405250810190610eb89190612eff565b610c01576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610ba690612eda565b610e87611164565b73ffffffffffffffffffffffffffffffffffffffff8316610edb576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610ba690612ea2565b73ffffffffffffffffffffffffffffffffffffffff8216610f37576040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610ba690612eda565b610a46848460418585611e10565b600a805460ff168015610ffe576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600a60248201527f444553595f5041555345440000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000604482015260640b5f80fd5b61100733611e9c565b600a805460ff19166001179055604080513381527f5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa9060200161fffddfdffdffdfdfdfdffdfdfdfdfdfdfdfdfdfdfdfdfdfdfdfdfdffdfdfdfdffff565b6110a1611164565b610a6f818060010160408051602081019091526000815261180e565b6110cb611164565b600a8054911515740100000000000000000000000000000000000000000260011790555050565b6000610aba826000546108356000546110c3565b6000610aba826000546108356000546113a0565b611142611164565b610a6f8180600060408051602081019091526000815261180e565b73ffffffffffffffffffffffffffffffffffffffff166000908152600f602052604090205460ff1690565b61117c611164565b600a8054911515620100000260ff60101b19161790555050565b6111a8611164565b610a6f81607760408051602081019091526000815261180e565b6111d8611164565b6009546040517f01ffc9a70000000000000000000000000000000000000000000000000000000081527fffffffff00000000000000000000000000000000000000000000000000000000821660048201527fa219a02500000000000000000000000000000000000000000000000000000000604482015273ffffffffffffffffffffffffffffffffffffffff909116906301ffc9a790602401602060405180830381865afa158015611288573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906112ac9190612eff565b61120e57600060bc6000610cca565b610a6f8173ffffffffffffffffffffffffffffffffffffffff16611ef0565b611282611164565b610a6f8160786041805160208101909152600081526118f5565b73ffffffffffffffffffffffffffffffffffffffff9182166000908152600160209081526040808320938516835292905220549081151590565b6000805a905073ffffffffffffffffffffffffffffffffffffffff84163314806113055750600360205281600052604060002054151515155b1561133a576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600760248201526619195e481913585960c51b604482015260640b5f80fd5b73ffffffffffffffffffffffffffffffffffffffff841660008181526020818152604080832080548601905585835260019283905282208054869360005281825260408320819055601e92909152815485929190859061139c908490612f5c565b90915550505095945050505050565b73ffffffffffffffffffffffffffffffffffffffff83166000818152600160209081526040808320805487941684529190529091205490919261139c565b73ffffffffffffffffffffffffffffffffffffffff8216826113df57506109398190565b82600073ffffffffffffffffffffffffffffffffffffffff168273ffffffffffffffffffffffffffffffffffffffff161415801561146d5750604051602401602081016040527f307830000000000000000000000000000000000000000000000000000000000081526000611496575b1515611475576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600760248201527f3078302eeeeee0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000604482015260640b5f80fd5b5060f8519056fea2646970667358221220fcc37856a4dc65c1da6b5c4fae9bef1f14fcc94cf1dcadd80cbb9ff5d7511cc164736f6c63430008120033';

// Re-export the old ABI for compatibility until the implementation is properly updated
exports.UNIVERSAL_TOKEN_ABI = [
  // Constructor
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  // ERC20 Events
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "Approval",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "Transfer",
    "type": "event"
  },
  // Universal Token Core Events
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "zrc20",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "contractAddress",
        "type": "address"
      }
    ],
    "name": "SetConnected",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "destination",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "TokenTransfer",
    "type": "event"
  },
  // Ownership Events
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  // ERC20 Standard Functions
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      }
    ],
    "name": "allowance",
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
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "balanceOf",
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
    "name": "decimals",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
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
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "transfer",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "transferFrom",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Initialize function (for UUPS pattern)
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "initialOwner",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "symbol",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "gatewayAddress",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "gas",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "uniswapRouterAddress",
        "type": "address"
      }
    ],
    "name": "initialize",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Universal Token Core Functions
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "zrc20",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "contractAddress",
        "type": "address"
      }
    ],
    "name": "setConnected",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "gatewayAddress",
        "type": "address"
      }
    ],
    "name": "setGateway",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "gas",
        "type": "uint256"
      }
    ],
    "name": "setGasLimit",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "destination",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "transferCrossChain",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  // Admin Functions
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "pause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "unpause",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  // Other getter functions
  {
    "inputs": [],
    "name": "gateway",
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
    "inputs": [],
    "name": "gasLimitAmount",
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
    "name": "isUniversal",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
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
    "inputs": [],
    "name": "uniswapRouter",
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
  // UUPS upgradeability
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newImplementation",
        "type": "address"
      }
    ],
    "name": "upgradeToAndCall",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
];

/** 
 * ZETACHAIN UNIVERSAL TOKEN CONTRACT
 * 
 * These placeholders should be replaced with the compiled bytecode and ABI
 * for the ZetaChain Universal Token contract from @zetachain/standard-contracts.
 */
exports.ZETACHAIN_UNIVERSAL_TOKEN_BYTECODE = exports.UNIVERSAL_TOKEN_BYTECODE; // placeholder
exports.ZETACHAIN_UNIVERSAL_TOKEN_ABI = exports.UNIVERSAL_TOKEN_ABI; // placeholder

/**
 * EVM UNIVERSAL TOKEN CONTRACT
 *
 * These placeholders should be replaced with the compiled bytecode and ABI
 * for the EVM Universal Token contract from @zetachain/standard-contracts.
 */
exports.EVM_UNIVERSAL_TOKEN_BYTECODE = exports.UNIVERSAL_TOKEN_BYTECODE; // placeholder
exports.EVM_UNIVERSAL_TOKEN_ABI = exports.UNIVERSAL_TOKEN_ABI; // placeholder

/**
 * Instructions for obtaining real bytecode and ABIs:
 * 
 * 1. Clone the standard-contracts repository:
 *    git clone https://github.com/zeta-chain/standard-contracts.git
 * 
 * 2. Install dependencies and compile contracts:
 *    cd standard-contracts
 *    yarn install
 *    npx hardhat compile
 * 
 * 3. Extract the ZetaChain Universal Token bytecode and ABI:
 *    - Bytecode: artifacts/contracts/token/contracts/example/ZetaChainUniversalToken.sol/ZetaChainUniversalToken.json
 *    - ABI: artifacts/contracts/token/contracts/example/ZetaChainUniversalToken.sol/ZetaChainUniversalToken.json
 * 
 * 4. Extract the EVM Universal Token bytecode and ABI:
 *    - Bytecode: artifacts/contracts/token/contracts/example/EVMUniversalToken.sol/EVMUniversalToken.json
 *    - ABI: artifacts/contracts/token/contracts/example/EVMUniversalToken.sol/EVMUniversalToken.json
 * 
 * 5. Use the extract bytecode and ABIs to replace the placeholders above.
 * 
 * NOTE: For development, you can use @thirdweb/contracts-js to get the ABIs if you don't want
 * to compile the contracts yourself. 
 */