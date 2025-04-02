import React from 'react';
import { formatTokenBalance, getChainName } from '../utils/tokenUtils';

/**
 * Token Card Component
 * 
 * Displays a Universal Token with its connected contracts across all chains
 * Shows token icon, name, symbol, and balances on each chain
 * 
 * @param {Object} props - Component props
 * @param {Object} props.token - Token data
 * @param {Function} props.onSelect - Function called when token is selected
 */
const TokenCard = ({ token, onSelect }) => {
  if (!token) return null;
  
  // Get the chains with their balances
  const chainInfo = token.sortedChains || [];
  
  return (
    <div 
      className="token-card"
      onClick={() => onSelect(token)}
    >
      <div className="token-card-header">
        <div className="token-icon">
          {token.iconUrl ? (
            <img src={token.iconUrl} alt={token.name} />
          ) : (
            <div className="token-icon-placeholder">
              {token.symbol?.[0] || token.name?.[0] || '?'}
            </div>
          )}
        </div>
        <div className="token-details">
          <h3 className="token-name">{token.name}</h3>
          <span className="token-symbol">{token.symbol}</span>
        </div>
      </div>
      
      <div className="token-chains">
        {chainInfo.map(chain => (
          <div key={chain.chainId} className="token-chain-row">
            <div className="chain-name">
              <span className="chain-dot" style={{ backgroundColor: chain.color || '#ccc' }}></span>
              {chain.chainName}
            </div>
            <div className="chain-balance">
              {chain.formattedBalance}
            </div>
          </div>
        ))}
        
        {chainInfo.length === 0 && (
          <div className="token-chain-row">
            <i>No connected chains found</i>
          </div>
        )}
      </div>
      
      <div className="token-card-footer">
        <span className="token-chains-count">
          {chainInfo.length} connected {chainInfo.length === 1 ? 'chain' : 'chains'}
        </span>
        <button className="token-select-btn">
          Transfer
        </button>
      </div>
    </div>
  );
};

export default TokenCard; 