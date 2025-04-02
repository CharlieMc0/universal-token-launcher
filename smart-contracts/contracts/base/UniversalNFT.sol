// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title UniversalNFT
 * @dev Base contract for Universal NFT implementation
 * This contract serves as the foundation for cross-chain compatible NFT collections
 */
abstract contract UniversalNFT is ERC721, Ownable {
    // Maximum supply of tokens in the collection
    uint256 private _maxSupply;
    
    // Base URI for metadata
    string private _baseTokenURI;
    
    // Next token ID to mint (starts at 1, 0 is reserved)
    uint256 private _nextTokenId = 1;
    
    /**
     * @dev Constructor for the UniversalNFT base contract
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
    ) ERC721(name_, symbol_) Ownable(initialOwner) {
        _baseTokenURI = baseURI_;
        _maxSupply = maxSupply_;
    }
    
    /**
     * @dev Returns the base URI for token metadata
     */
    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }
    
    /**
     * @dev Sets a new base URI for token metadata (only callable by owner)
     * @param baseURI_ The new base URI
     */
    function setBaseURI(string memory baseURI_) external onlyOwner {
        _baseTokenURI = baseURI_;
    }
    
    /**
     * @dev Returns the maximum supply of tokens in the collection
     */
    function maxSupply() public view returns (uint256) {
        return _maxSupply;
    }
    
    /**
     * @dev Returns the next token ID to be minted
     */
    function nextTokenId() public view returns (uint256) {
        return _nextTokenId;
    }
    
    /**
     * @dev Mints a new token to the specified address (only callable by owner)
     * @param to The address to mint the token to
     * @return The ID of the minted token
     */
    function mint(address to) external onlyOwner returns (uint256) {
        require(_nextTokenId <= _maxSupply, "Max supply reached");
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        return tokenId;
    }
    
    /**
     * @dev Mints multiple tokens to the specified address (only callable by owner)
     * @param to The address to mint the tokens to
     * @param amount The number of tokens to mint
     * @return The array of minted token IDs
     */
    function mintBatch(address to, uint256 amount) external onlyOwner returns (uint256[] memory) {
        require(_nextTokenId + amount - 1 <= _maxSupply, "Would exceed max supply");
        
        uint256[] memory tokenIds = new uint256[](amount);
        for (uint256 i = 0; i < amount; i++) {
            uint256 tokenId = _nextTokenId++;
            _safeMint(to, tokenId);
            tokenIds[i] = tokenId;
        }
        
        return tokenIds;
    }
    
    /**
     * @dev Burns a token (only callable by owner or token holder)
     * @param tokenId The ID of the token to burn
     */
    function burn(uint256 tokenId) external {
        address sender = _msgSender();
        address owner = ownerOf(tokenId);
        
        require(
            sender == owner || 
            sender == getApproved(tokenId) || 
            isApprovedForAll(owner, sender) ||
            sender == Ownable.owner(),
            "Not authorized to burn"
        );
        
        _burn(tokenId);
    }
    
    /**
     * @dev Transfers the ownership of the contract to a new account
     * @param newOwner The address of the new owner
     */
    function transferOwnership(address newOwner) public virtual override onlyOwner {
        super.transferOwnership(newOwner);
    }
} 