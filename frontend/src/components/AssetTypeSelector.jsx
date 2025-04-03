import React from 'react';
import styled from 'styled-components';

const AssetTypeContainer = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const AssetTypeCard = styled.div`
  flex: 1;
  background-color: ${props => props.selected ? 'rgba(74, 159, 255, 0.1)' : 'var(--card-bg)'};
  border: 2px solid ${props => props.selected ? 'var(--accent-primary)' : 'var(--border)'};
  border-radius: 12px;
  padding: 24px;
  cursor: pointer;
  text-align: center;
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    transform: ${props => props.selected ? 'none' : 'translateY(-4px)'};
    box-shadow: ${props => props.selected ? 'none' : '0 8px 24px rgba(0, 0, 0, 0.15)'};
  }
`;

const AssetTypeIcon = styled.div`
  width: 48px;
  height: 48px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.selected ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 50%;
  color: ${props => props.selected ? '#fff' : 'var(--text-primary)'};
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
`;

const AssetTypeTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
`;

const AssetTypeDescription = styled.p`
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 0;
`;

// Simple icon components
const TokenIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 7V17M7 12H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const NFTIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M9 9H9.01M15 15H15.01M9 15L15 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/**
 * Asset Type Selector component
 * 
 * Visual card selector for choosing between different asset types (Token or NFT)
 * 
 * @param {Object} props - Component props
 * @param {string} props.selectedType - Currently selected asset type ('token' or 'nft')
 * @param {Function} props.onSelect - Callback function when asset type is selected
 * @param {string} props.pageType - Page type ('make' or 'move') to customize the text content
 */
const AssetTypeSelector = ({ selectedType, onSelect, pageType = 'make' }) => {
  const isMakePage = pageType === 'make';
  
  return (
    <AssetTypeContainer>
      <AssetTypeCard 
        selected={selectedType === 'token'} 
        onClick={() => onSelect('token')}
      >
        <AssetTypeIcon selected={selectedType === 'token'}>
          <TokenIcon />
        </AssetTypeIcon>
        <AssetTypeTitle>
          {isMakePage ? 'Make a Token' : 'Move Tokens'}
        </AssetTypeTitle>
        <AssetTypeDescription>
          {isMakePage 
            ? 'Design your own token that works across multiple blockchains' 
            : 'Move tokens seamlessly between different blockchains'}
        </AssetTypeDescription>
      </AssetTypeCard>
      
      <AssetTypeCard 
        selected={selectedType === 'nft'} 
        onClick={() => onSelect('nft')}
      >
        <AssetTypeIcon selected={selectedType === 'nft'}>
          <NFTIcon />
        </AssetTypeIcon>
        <AssetTypeTitle>
          {isMakePage ? 'Make an NFT Collection' : 'Move NFTs'}
        </AssetTypeTitle>
        <AssetTypeDescription>
          {isMakePage 
            ? 'Design unique digital collectibles that can move between chains' 
            : 'Move your NFTs seamlessly between different chains'}
        </AssetTypeDescription>
      </AssetTypeCard>
    </AssetTypeContainer>
  );
};

export default AssetTypeSelector; 