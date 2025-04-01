// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./base/UniversalToken.sol";

/**
 * @title EVMUniversalToken
 * @dev EVM chain implementation of Universal Token with cross-chain capabilities
 * This contract includes functionality for cross-chain transfers from/to ZetaChain
 */
contract EVMUniversalToken is UniversalToken {
    // ZetaChain contract address
    address public zetaChainContract;
    
    // This chain ID
    uint256 public immutable chainId;
    
    // ZetaChain-specific identifiers
    uint256 public constant ZETACHAIN_ID = 7000;
    
    // Events
    event ZetaChainContractSet(address contractAddress);
    event CrossChainTransferInitiated(address from, uint256 destChainId, address to, uint256 amount);
    event CrossChainTransferReceived(uint256 sourceChainId, address from, address to, uint256 amount);
    
    /**
     * @dev Constructor for EVMUniversalToken
     * @param name_ The name of the token
     * @param symbol_ The symbol of the token
     * @param decimals_ The number of decimals for the token
     * @param initialSupply The initial supply of tokens to mint to the owner
     * @param currentChainId The ID of the current EVM chain
     * @param initialOwner The initial owner of the token contract
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupply,
        uint256 currentChainId,
        address initialOwner
    ) UniversalToken(name_, symbol_, decimals_, initialOwner) {
        require(currentChainId != ZETACHAIN_ID, "Cannot deploy EVMUniversalToken on ZetaChain");
        
        chainId = currentChainId;
        
        if (initialSupply > 0) {
            _mint(initialOwner, initialSupply);
        }
    }
    
    /**
     * @dev Sets the ZetaChain contract address
     * @param contractAddress The address of the connected contract on ZetaChain
     */
    function setZetaChainContract(address contractAddress) external onlyOwner {
        require(contractAddress != address(0), "Invalid contract address");
        
        zetaChainContract = contractAddress;
        emit ZetaChainContractSet(contractAddress);
    }
    
    /**
     * @dev Initiates a cross-chain transfer to ZetaChain or another EVM chain via ZetaChain
     * @param destChainId The ID of the destination chain
     * @param recipient The address of the recipient on the destination chain
     * @param amount The amount of tokens to transfer
     */
    function crossChainTransfer(uint256 destChainId, address recipient, uint256 amount) external {
        require(destChainId != chainId, "Cannot transfer to same chain");
        require(zetaChainContract != address(0), "ZetaChain contract not set");
        require(recipient != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be greater than zero");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // Burn tokens on the current EVM chain
        _burn(msg.sender, amount);
        
        // Emit event for the cross-chain transfer
        // In a real implementation, this would interact with ZetaChain's cross-chain messaging
        emit CrossChainTransferInitiated(msg.sender, destChainId, recipient, amount);
        
        // Note: In a production implementation, this would trigger the ZetaChain
        // cross-chain messaging system to mint tokens on the destination chain
    }
    
    /**
     * @dev Receives a cross-chain transfer (would be called by the ZetaChain connector)
     * @param sourceChainId The ID of the source chain
     * @param sender The address of the sender on the source chain
     * @param recipient The address of the recipient on this chain
     * @param amount The amount of tokens to transfer
     */
    function receiveCrossChainTransfer(
        uint256 sourceChainId,
        address sender,
        address recipient,
        uint256 amount
    ) external onlyOwner {
        require(sourceChainId != chainId, "Cannot receive from same chain");
        require(recipient != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be greater than zero");
        
        // Mint tokens to the recipient on this EVM chain
        _mint(recipient, amount);
        
        emit CrossChainTransferReceived(sourceChainId, sender, recipient, amount);
    }
} 