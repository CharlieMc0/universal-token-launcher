import React, { useState } from 'react';
import styled from 'styled-components';
import BuyNFTPage from '../BuyNFT';

// Styled Components
const PageContainer = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 20px;
`;

const PageTitle = styled.h1`
  margin-bottom: 16px;
  text-align: center;
`;

const PageDescription = styled.p`
  text-align: center;
  color: var(--text-secondary);
  margin-bottom: 40px;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
`;

const ToggleContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 40px;
`;

const ToggleButton = styled.button`
  background-color: ${props => props.active ? 'var(--accent-primary)' : 'transparent'};
  color: ${props => props.active ? 'white' : 'var(--text-secondary)'};
  border: 1px solid ${props => props.active ? 'var(--accent-primary)' : 'var(--border)'};
  border-radius: ${props => props.position === 'left' ? '8px 0 0 8px' : '0 8px 8px 0'};
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  height: 48px;
  box-sizing: border-box;
  
  &:hover {
    background-color: ${props => props.active ? 'var(--accent-primary)' : 'rgba(60, 157, 242, 0.1)'};
  }
`;

const ComingSoon = styled.div`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 60px 32px;
  text-align: center;
  margin-top: 20px;
  border: 1px solid var(--border);
`;

const ComingSoonTitle = styled.h2`
  font-size: 28px;
  margin-bottom: 16px;
`;

const ComingSoonText = styled.p`
  color: var(--text-secondary);
  max-width: 600px;
  margin: 0 auto 24px;
`;

const BuyPage = () => {
  const [activeTab, setActiveTab] = useState('nft'); // 'token' or 'nft'
  
  return (
    <PageContainer>
      <PageTitle>Buy Digital Assets</PageTitle>
      <PageDescription>
        Purchase tokens or NFTs using any ZRC20 asset, including Bitcoin, and receive them on your preferred chain.
      </PageDescription>
      
      <ToggleContainer>
        <ToggleButton 
          active={activeTab === 'token'} 
          position="left"
          onClick={() => setActiveTab('token')}
        >
          Buy Tokens
        </ToggleButton>
        <ToggleButton 
          active={activeTab === 'nft'} 
          position="right"
          onClick={() => setActiveTab('nft')}
        >
          Buy NFTs
        </ToggleButton>
      </ToggleContainer>
      
      {activeTab === 'nft' ? (
        <BuyNFTPage embedded={"true"} />
      ) : (
        <ComingSoon>
          <ComingSoonTitle>Token Marketplace Coming Soon</ComingSoonTitle>
          <ComingSoonText>
            Our token marketplace is currently under development. Soon you'll be able to purchase tokens using any ZRC20 asset!
          </ComingSoonText>
        </ComingSoon>
      )}
    </PageContainer>
  );
};

export default BuyPage; 