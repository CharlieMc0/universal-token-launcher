import React from 'react';
import styled from 'styled-components';

// Chain mappings that can be used across components
export const chainLogos = {
  '7001': '/chain-logos/zetachain.svg',
  '11155111': '/chain-logos/ethereum.svg',
  '97': '/chain-logos/bsc.svg',
  '84532': '/chain-logos/base.svg',
  'solana': '/chain-logos/solana.svg',
  'sui': '/chain-logos/sui.svg',
  'ton': '/chain-logos/ton.svg'
};

export const chainNames = {
  '7001': 'ZetaChain',
  '11155111': 'Ethereum Sepolia',
  '97': 'BSC Testnet',
  '84532': 'Base Sepolia',
  'solana': 'Solana Testnet',
  'sui': 'Sui Testnet',
  'ton': 'TON Testnet'
};

const Tile = styled.div`
  position: relative;
  background: ${props => props.$selected ? 'var(--accent-primary-transparent)' : 'var(--bg-primary)'};
  border: 2px solid ${props => props.$selected ? 'var(--accent-primary)' : 'var(--border)'};
  border-radius: 12px;
  padding: 16px;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.$disabled ? 0.6 : 1};
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  min-width: 160px;

  &:hover {
    ${props => !props.$disabled && `
      border-color: var(--accent-primary);
      transform: translateY(-2px);
    `}
  }
`;

const ChainInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`;

const ChainLogo = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
`;

const ChainName = styled.div`
  font-size: 14px;
  color: var(--text-primary);
  font-weight: 500;
`;

const Balance = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-top: 4px;
`;

const TokenTile = ({
  token,
  chainId,
  balance,
  selected,
  disabled,
  onClick
}) => {
  return (
    <Tile
      $selected={selected}
      $disabled={disabled}
      onClick={() => !disabled && onClick(token.id, chainId)}
    >
      <ChainInfo>
        <ChainLogo 
          src={chainLogos[chainId]} 
          alt={`${chainNames[chainId]} logo`}
        />
        <ChainName>{chainNames[chainId]}</ChainName>
        <Balance>{balance} {token.symbol}</Balance>
      </ChainInfo>
    </Tile>
  );
};

export default TokenTile; 