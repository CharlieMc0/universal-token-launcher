import React, { useState } from 'react';
import styled from 'styled-components';
import { formatTokenBalance } from '../utils/tokenUtils';
import { chainLogos, chainNames } from './TokenTile';
import { ethers } from 'ethers';

// Styled components according to our enhanced design
const Card = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  height: 72px;
  background-color: var(--card-bg);
  border-radius: 12px;
  border: 1px solid var(--border);
  margin-bottom: 12px;
  transition: all 0.2s ease;
  
  &:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    border-color: var(--accent-primary-transparent);
  }
`;

const TokenInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const TokenIconWrapper = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.color || '#3C9DF2'};
`;

const TokenIcon = styled.img`
  width: 36px;
  height: 36px;
  border-radius: 50%;
`;

const TokenIconPlaceholder = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: ${props => props.color || '#3C9DF2'};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
`;

const TokenDetails = styled.div`
  display: flex;
  flex-direction: column;
`;

const TokenNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TokenName = styled.span`
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
`;

const TokenSymbol = styled.span`
  font-size: 14px;
  color: var(--text-secondary);
`;

const OwnerBadge = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: var(--accent-secondary);
  background-color: rgba(0, 232, 181, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
`;

const ChainBadges = styled.div`
  display: flex;
  gap: 4px;
  margin-top: 4px;
`;

const ChainBadge = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  position: relative;
  
  img {
    width: 16px;
    height: 16px;
  }
`;

const TokenBalance = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: right;
  padding: 0 16px;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionButton = styled.button`
  background-color: ${props => props.primary ? 'var(--accent-primary)' : 'transparent'};
  color: ${props => props.primary ? 'white' : 'var(--text-primary)'};
  border: 1px solid ${props => props.primary ? 'var(--accent-primary)' : 'var(--border)'};
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${props => props.primary ? 'var(--accent-primary)' : 'rgba(60, 157, 242, 0.1)'};
    transform: translateY(-1px);
  }
`;

// Add new styled components for expanded view
const ExpandedSection = styled.div`
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
  overflow: hidden;
  max-height: ${props => props.expanded ? '500px' : '0'};
  opacity: ${props => props.expanded ? '1' : '0'};
  transition: all 0.3s ease-in-out;
`;

const ChainBalanceList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ChainBalanceItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
`;

const ChainInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ChainLogoImg = styled.img`
  width: 20px;
  height: 20px;
`;

const ChainBalanceAmount = styled.div`
  font-weight: 500;
  color: var(--text-primary);
`;

/**
 * Enhanced Token Card Component
 * 
 * Displays a token in a compact, information-dense horizontal card format
 * Shows token name, symbol, ownership status, available chains, balance, and actions
 * 
 * @param {Object} props - Component props
 * @param {Object} props.token - Token data
 * @param {boolean} props.isOwner - Whether the user is the token owner/deployer
 * @param {Function} props.onTransfer - Callback for transfer action
 * @param {Function} props.onMint - Callback for mint action (only for token owners)
 */
const EnhancedTokenCard = ({ 
  token, 
  isOwner = false, 
  onTransfer,
  onMint
}) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!token) return null;
  
  // Calculate total balance across all chains
  const totalBalance = token.chainInfo && token.chainInfo.length > 0
    ? token.chainInfo.reduce((sum, chain) => {
        try {
          const chainBalance = chain.balance || '0';
          return sum + ethers.toBigInt(chainBalance);
        } catch (e) {
          console.error('Error adding chain balance:', e);
          return sum;
        }
      }, ethers.toBigInt(0))
    : token.balances 
      ? Object.values(token.balances).reduce((sum, val) => {
          try {
            return sum + ethers.toBigInt(val || '0');
          } catch (e) {
            console.error('Error adding balance from balances object:', e);
            return sum;
          }
        }, ethers.toBigInt(0))
      : ethers.toBigInt(0);
  
  // Format the total balance
  const formattedBalance = formatTokenBalance(
    totalBalance.toString(), 
    token.decimals || 18
  );
  
  // Get deployed chains for badges
  const deployedChains = token.deployedChains || [];
  
  // Handle card click to expand/collapse
  const handleCardClick = (e) => {
    setExpanded(!expanded);
  };
  
  // Handle transfer button click
  const handleTransferClick = (e) => {
    e.stopPropagation();
    if (typeof onTransfer === 'function') {
      onTransfer(token);
    }
  };
  
  // Handle mint button click (for token owners)
  const handleMintClick = (e) => {
    e.stopPropagation();
    if (isOwner && typeof onMint === 'function') {
      onMint(token);
    }
  };
  
  // Get chain balances sorted by balance amount (highest first)
  const sortedChainBalances = [...(token.chainInfo || [])].sort((a, b) => {
    try {
      const aBalance = ethers.toBigInt(a.balance || '0');
      const bBalance = ethers.toBigInt(b.balance || '0');
      return bBalance > aBalance ? 1 : bBalance < aBalance ? -1 : 0;
    } catch (e) {
      return 0;
    }
  });
  
  return (
    <>
      <Card onClick={handleCardClick}>
        <TokenInfo>
          <TokenIconWrapper>
            {token.iconUrl ? (
              <TokenIcon src={token.iconUrl} alt={token.name} />
            ) : (
              <TokenIconPlaceholder>
                {token.symbol?.[0] || token.name?.[0] || '?'}
              </TokenIconPlaceholder>
            )}
          </TokenIconWrapper>
          
          <TokenDetails>
            <TokenNameRow>
              <TokenName>{token.name}</TokenName>
              <TokenSymbol>{token.symbol}</TokenSymbol>
              {isOwner && <OwnerBadge>OWNER</OwnerBadge>}
            </TokenNameRow>
            
            <ChainBadges>
              {deployedChains.slice(0, 5).map(chainId => (
                <ChainBadge key={chainId}>
                  <img 
                    src={chainLogos[chainId] || '/chain-logos/zetachain.svg'} 
                    alt={chainNames[chainId] || `Chain ${chainId}`}
                    title={chainNames[chainId] || `Chain ${chainId}`}
                  />
                </ChainBadge>
              ))}
              
              {deployedChains.length > 5 && (
                <ChainBadge>+{deployedChains.length - 5}</ChainBadge>
              )}
            </ChainBadges>
          </TokenDetails>
        </TokenInfo>
        
        <TokenBalance>{formattedBalance} {token.symbol}</TokenBalance>
        
        <ActionButtons>
          <ActionButton primary onClick={handleTransferClick}>Transfer</ActionButton>
          {isOwner && <ActionButton onClick={handleMintClick}>Mint</ActionButton>}
        </ActionButtons>
      </Card>
      
      <ExpandedSection expanded={expanded}>
        <ChainBalanceList>
          {sortedChainBalances.map((chain) => (
            <ChainBalanceItem key={chain.chain_id || chain.chainId}>
              <ChainInfo>
                <ChainLogoImg 
                  src={chainLogos[chain.chain_id || chain.chainId] || '/chain-logos/zetachain.svg'} 
                  alt={chainNames[chain.chain_id || chain.chainId] || 'Chain'} 
                />
                <div>{chainNames[chain.chain_id || chain.chainId] || `Chain ${chain.chain_id || chain.chainId}`}</div>
              </ChainInfo>
              <ChainBalanceAmount>
                {formatTokenBalance(chain.balance || '0', token.decimals || 18)} {token.symbol}
              </ChainBalanceAmount>
            </ChainBalanceItem>
          ))}
        </ChainBalanceList>
      </ExpandedSection>
    </>
  );
};

export default EnhancedTokenCard; 