// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title UniversalToken
 * @dev Base contract for Universal Token implementation
 * This contract serves as the foundation for cross-chain compatible tokens
 */
abstract contract UniversalToken is ERC20, Ownable {
    uint8 private _decimals;
    
    /**
     * @dev Constructor for the UniversalToken base contract
     * @param name_ The name of the token
     * @param symbol_ The symbol of the token
     * @param decimals_ The number of decimals for the token
     * @param initialOwner The initial owner of the token contract
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        address initialOwner
    ) ERC20(name_, symbol_) Ownable(initialOwner) {
        _decimals = decimals_;
    }
    
    /**
     * @dev Returns the number of decimals used for token display
     */
    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }
    
    /**
     * @dev Mints tokens to the specified address (only callable by owner)
     * @param to The address to mint tokens to
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @dev Burns tokens from the specified address (only callable by owner or token holder)
     * @param from The address to burn tokens from
     * @param amount The amount of tokens to burn
     */
    function burn(address from, uint256 amount) external {
        require(msg.sender == from || msg.sender == owner(), "Not authorized to burn");
        _burn(from, amount);
    }
    
    /**
     * @dev Transfers the ownership of the contract to a new account
     * @param newOwner The address of the new owner
     */
    function transferOwnership(address newOwner) public virtual override onlyOwner {
        super.transferOwnership(newOwner);
    }
} 