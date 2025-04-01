// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./base/UniversalToken.sol";

/**
 * @title ZetaChainUniversalToken
 * @dev ZetaChain implementation of Universal Token with cross-chain capabilities
 * This contract includes functionality for cross-chain transfers via ZetaChain
 */
contract ZetaChainUniversalToken is UniversalToken {
    // Mapping of connected contracts on other chains
    mapping(uint256 => address) public connectedContracts;
    
    // ZetaChain-specific identifiers
    uint256 public constant ZETACHAIN_ID = 7000;
    
    // Events
    event ConnectedContractSet(uint256 chainId, address contractAddress);
    event CrossChainTransferInitiated(address from, uint256 destChainId, address to, uint256 amount);
    event CrossChainTransferReceived(uint256 sourceChainId, address from, address to, uint256 amount);
    
    /**
     * @dev Constructor for ZetaChainUniversalToken
     * @param name_ The name of the token
     * @param symbol_ The symbol of the token
     * @param decimals_ The number of decimals for the token
     * @param initialSupply The initial supply of tokens to mint to the owner
     * @param initialOwner The initial owner of the token contract
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupply,
        address initialOwner
    ) UniversalToken(name_, symbol_, decimals_, initialOwner) {
        if (initialSupply > 0) {
            _mint(initialOwner, initialSupply);
        }
    }
    
    /**
     * @dev Sets a connected contract on another chain
     * @param chainId The ID of the chain where the connected contract is deployed
     * @param contractAddress The address of the connected contract
     */
    function setConnectedContract(uint256 chainId, address contractAddress) external onlyOwner {
        require(chainId != ZETACHAIN_ID, "Cannot set connected contract on ZetaChain");
        require(contractAddress != address(0), "Invalid contract address");
        
        connectedContracts[chainId] = contractAddress;
        emit ConnectedContractSet(chainId, contractAddress);
    }
    
    /**
     * @dev Initiates a cross-chain transfer
     * @param destChainId The ID of the destination chain
     * @param recipient The address of the recipient on the destination chain
     * @param amount The amount of tokens to transfer
     */
    function crossChainTransfer(uint256 destChainId, address recipient, uint256 amount) external {
        require(destChainId != ZETACHAIN_ID, "Cannot transfer to same chain");
        require(connectedContracts[destChainId] != address(0), "No connected contract on destination chain");
        require(recipient != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be greater than zero");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        // Burn tokens on ZetaChain
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
        require(sourceChainId != ZETACHAIN_ID, "Cannot receive from same chain");
        require(connectedContracts[sourceChainId] != address(0), "No connected contract on source chain");
        require(recipient != address(0), "Invalid recipient address");
        require(amount > 0, "Amount must be greater than zero");
        
        // Mint tokens to the recipient on ZetaChain
        _mint(recipient, amount);
        
        emit CrossChainTransferReceived(sourceChainId, sender, recipient, amount);
    }
} 