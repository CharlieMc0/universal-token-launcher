// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "./base/UniversalNFT.sol";

/**
 * @title EVMUniversalNFT
 * @dev EVM chain implementation of Universal NFT with cross-chain capabilities
 * This contract includes functionality for cross-chain transfers from/to ZetaChain
 */
contract EVMUniversalNFT is UniversalNFT {
    // ZetaChain contract address
    address public zetaChainContract;
    
    // This chain ID
    uint256 public immutable chainId;
    
    // ZetaChain-specific identifiers
    uint256 public constant ZETACHAIN_ID = 7000;
    uint256 public constant ZETACHAIN_TESTNET_ID = 7001;
    
    // Events
    event ZetaChainContractSet(address contractAddress);
    event CrossChainTransferInitiated(uint256 tokenId, uint256 destChainId, address to);
    event CrossChainTransferReceived(uint256 tokenId, uint256 sourceChainId, address to);
    
    /**
     * @dev Constructor for EVMUniversalNFT
     * @param name_ The name of the collection
     * @param symbol_ The symbol of the collection
     * @param baseURI_ The base URI for token metadata
     * @param maxSupply_ The maximum supply of tokens in the collection
     * @param currentChainId The ID of the current EVM chain
     * @param initialOwner The initial owner of the NFT contract
     */
    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        uint256 maxSupply_,
        uint256 currentChainId,
        address initialOwner
    ) UniversalNFT(name_, symbol_, baseURI_, maxSupply_, initialOwner) {
        require(
            currentChainId != ZETACHAIN_ID && currentChainId != ZETACHAIN_TESTNET_ID, 
            "Cannot deploy EVMUniversalNFT on ZetaChain"
        );
        
        chainId = currentChainId;
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
     * @dev Initiates a cross-chain transfer to ZetaChain
     * @param tokenId The ID of the token to transfer
     * @param recipient The address of the recipient on ZetaChain
     */
    function crossChainTransfer(uint256 tokenId, address recipient) external {
        require(ownerOf(tokenId) == _msgSender(), "Not token owner");
        require(zetaChainContract != address(0), "ZetaChain contract not set");
        require(recipient != address(0), "Invalid recipient address");
        
        // Burn the token on the current EVM chain
        _burn(tokenId);
        
        // Emit event for the cross-chain transfer
        // In a real implementation, this would interact with ZetaChain's cross-chain messaging
        emit CrossChainTransferInitiated(tokenId, ZETACHAIN_ID, recipient);
        
        // Note: In a production implementation, this would trigger the ZetaChain
        // cross-chain messaging system to mint the token on ZetaChain
    }
    
    /**
     * @dev Receives a cross-chain transfer (would be called by the ZetaChain connector)
     * @param tokenId The ID of the token to receive
     * @param recipient The address of the recipient on this chain
     */
    function receiveCrossChainTransfer(
        uint256 tokenId,
        address recipient
    ) external onlyOwner {
        require(recipient != address(0), "Invalid recipient address");
        
        // Check if token ID already exists by trying to get its owner
        try this.ownerOf(tokenId) returns (address) {
            revert("Token ID already exists");
        } catch {
            // Token doesn't exist, we can mint it
            _safeMint(recipient, tokenId);
            emit CrossChainTransferReceived(tokenId, ZETACHAIN_ID, recipient);
        }
    }
} 