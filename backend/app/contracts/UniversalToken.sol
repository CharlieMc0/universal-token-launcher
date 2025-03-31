// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title UniversalToken
 * @dev Implementation of a Universal Token that can be deployed on multiple chains
 * and used for cross-chain transfers via ZetaChain.
 */
contract UniversalToken is ERC20, Ownable {
    // Mapping to track if an address is a bridge contract
    mapping(address => bool) public isBridgeContract;
    
    // Events
    event BridgeContractSet(address indexed bridgeContract, bool status);
    event TokensBurned(address indexed from, uint256 amount, string destinationChain);
    event TokensMinted(address indexed to, uint256 amount, string sourceChain);
    
    constructor(
        string memory name,
        string memory symbol,
        uint8 decimals,
        uint256 totalSupply
    ) ERC20(name, symbol) {
        _mint(msg.sender, totalSupply);
    }
    
    /**
     * @dev Set a bridge contract address that can burn and mint tokens
     * @param bridgeContract The address of the bridge contract
     * @param status Whether the address is a bridge contract
     */
    function setBridgeContract(address bridgeContract, bool status) external onlyOwner {
        isBridgeContract[bridgeContract] = status;
        emit BridgeContractSet(bridgeContract, status);
    }
    
    /**
     * @dev Burn tokens for cross-chain transfer
     * @param amount Amount of tokens to burn
     * @param destinationChain Chain ID of the destination chain
     */
    function burnForTransfer(uint256 amount, string memory destinationChain) external {
        require(amount > 0, "Amount must be greater than 0");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        _burn(msg.sender, amount);
        emit TokensBurned(msg.sender, amount, destinationChain);
    }
    
    /**
     * @dev Mint tokens from cross-chain transfer
     * @param to Address to receive the tokens
     * @param amount Amount of tokens to mint
     * @param sourceChain Chain ID of the source chain
     */
    function mintFromTransfer(
        address to,
        uint256 amount,
        string memory sourceChain
    ) external {
        require(isBridgeContract[msg.sender], "Only bridge contract can mint");
        require(amount > 0, "Amount must be greater than 0");
        
        _mint(to, amount);
        emit TokensMinted(to, amount, sourceChain);
    }
    
    /**
     * @dev Override transfer function to check for bridge contract
     */
    function transfer(address to, uint256 amount) public virtual override returns (bool) {
        require(!isBridgeContract[to], "Cannot transfer to bridge contract");
        return super.transfer(to, amount);
    }
    
    /**
     * @dev Override transferFrom function to check for bridge contract
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public virtual override returns (bool) {
        require(!isBridgeContract[to], "Cannot transfer to bridge contract");
        return super.transferFrom(from, to, amount);
    }
} 