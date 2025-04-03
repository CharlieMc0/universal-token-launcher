import React, { useState } from 'react';
import styled from 'styled-components';
import AssetTypeSelector from '../../components/AssetTypeSelector';
import MoveTokensPage from './MoveTokens';
import MoveNFTPage from '../MoveNFT';
import './MovePage.css';

// Styled Components
const PageContainer = styled.div`
  max-width: 960px;
  margin: 0 auto;
  padding: 48px 24px;
`;

const PageTitle = styled.h1`
  margin-bottom: 16px;
  font-weight: 700;
  font-size: 2.5rem;
  background: linear-gradient(135deg, #4A9FFF 0%, #A269FF 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-fill-color: transparent;
`;

const PageDescription = styled.p`
  color: var(--text-secondary);
  margin-bottom: 48px;
  max-width: 600px;
  font-size: 1.125rem;
  line-height: 1.6;
`;

const ContentContainer = styled.div`
  width: 100%;
  background: var(--card-bg);
  border-radius: 16px;
  border: 1px solid var(--border);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
  padding: 32px;
  
  @media (max-width: 768px) {
    padding: 24px 16px;
  }
`;

/**
 * Move Page - enables moving digital assets between chains
 */
const MovePage = ({ walletAddress }) => {
  const [assetType, setAssetType] = useState('token'); // 'token' or 'nft'
  
  return (
    <PageContainer>
      <PageTitle>Move Digital Assets</PageTitle>
      <PageDescription>
        Move your tokens and NFTs seamlessly across multiple blockchains with Universal Launcher technology.
      </PageDescription>
      
      <AssetTypeSelector 
        selectedType={assetType} 
        onSelect={setAssetType}
        pageType="move"
      />
      
      <ContentContainer>
        {assetType === 'token' ? (
          <MoveTokensPage walletAddress={walletAddress} embedded="true" />
        ) : (
          <MoveNFTPage embedded={true} />
        )}
      </ContentContainer>
    </PageContainer>
  );
};

export default MovePage; 