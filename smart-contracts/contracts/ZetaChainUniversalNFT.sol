// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./base/UniversalNFT.sol";

/**
 * @title ZetaChainUniversalNFT
 * @dev ZetaChain implementation of Universal NFT with cross-chain capabilities
 * This contract includes functionality for cross-chain transfers from/to connected chains
 */
contract ZetaChainUniversalNFT is UniversalNFT {
    // Mapping of connected chains to their contract addresses
    mapping(uint256 => address) public connectedContracts;
    
    // Chain IDs for easy reference
    uint256 public constant ZETA_CHAIN_ID = 7000;
    uint256 public constant ZETA_TESTNET_ID = 7001;
    
    // Events
    event ConnectedContractSet(uint256 chainId, address contractAddress);
    event CrossChainTransferInitiated(uint256 tokenId, uint256 destChainId, address to);
    event CrossChainTransferReceived(uint256 tokenId, uint256 sourceChainId, address to);
    
    /**
     * @dev Constructor for ZetaChainUniversalNFT
     * @param name_ The name of the collection
     * @param symbol_ The symbol of the collection
     * @param baseURI_ The base URI for token metadata
     * @param maxSupply_ The maximum supply of tokens in the collection
     * @param initialOwner The initial owner of the NFT contract
     */
    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        uint256 maxSupply_,
        address initialOwner
    ) UniversalNFT(name_, symbol_, baseURI_, maxSupply_, initialOwner) {}
    
    /**
     * @dev Sets a connected contract address for a specific chain
     * @param chainId The ID of the connected chain
     * @param contractAddress The address of the connected contract
     */
    function setConnectedContract(uint256 chainId, address contractAddress) external onlyOwner {
        require(contractAddress != address(0), "Invalid contract address");
        require(chainId != ZETA_CHAIN_ID && chainId != ZETA_TESTNET_ID, "Cannot connect to ZetaChain");
        
        connectedContracts[chainId] = contractAddress;
        emit ConnectedContractSet(chainId, contractAddress);
    }
    
    /**
     * @dev Initiates a cross-chain transfer to another chain
     * @param tokenId The ID of the token to transfer
     * @param destChainId The ID of the destination chain
     * @param recipient The address of the recipient on the destination chain
     */
    function crossChainTransfer(uint256 tokenId, uint256 destChainId, address recipient) external {
        require(ownerOf(tokenId) == _msgSender(), "Not token owner");
        require(connectedContracts[destChainId] != address(0), "Destination chain not connected");
        require(recipient != address(0), "Invalid recipient address");
        
        // Burn the token on ZetaChain
        _burn(tokenId);
        
        // Emit event for the cross-chain transfer
        // In a real implementation, this would interact with ZetaChain's cross-chain messaging
        emit CrossChainTransferInitiated(tokenId, destChainId, recipient);
        
        // Note: In a production implementation, this would trigger ZetaChain's
        // cross-chain messaging system to mint the token on the destination chain
    }
    
    /**
     * @dev Receives a token from another chain (would be called by the ZetaChain connector)
     * @param tokenId The ID of the token to receive
     * @param sourceChainId The ID of the source chain
     * @param recipient The address of the recipient on ZetaChain
     */
    function receiveCrossChainTransfer(
        uint256 tokenId,
        uint256 sourceChainId,
        address recipient
    ) external onlyOwner {
        require(connectedContracts[sourceChainId] != address(0), "Source chain not connected");
        require(recipient != address(0), "Invalid recipient address");
        
        // Check if token ID already exists by trying to get its owner
        // This will revert if the token doesn't exist
        try this.ownerOf(tokenId) returns (address) {
            revert("Token ID already exists");
        } catch {
            // Token doesn't exist, we can mint it
            _safeMint(recipient, tokenId);
            emit CrossChainTransferReceived(tokenId, sourceChainId, recipient);
        }
    }
} 