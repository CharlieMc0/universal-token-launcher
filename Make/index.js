import React, { useState } from 'react';
import styled from 'styled-components';
import LaunchPage from '../Launch';
import LaunchNFTPage from '../LaunchNFT';
import AssetTypeSelector from '../../components/AssetTypeSelector';

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
 * Make Page - replaces the Create page with new design
 */
const MakePage = () => {
  const [assetType, setAssetType] = useState('token'); // 'token' or 'nft'
  
  return (
    <PageContainer>
      <PageTitle>Make Universal Assets</PageTitle>
      <PageDescription>
        Design and launch tokens or NFT collections that work seamlessly across multiple blockchains with Universal Launcher technology.
      </PageDescription>
      
      <AssetTypeSelector 
        selectedType={assetType} 
        onSelect={setAssetType}
        pageType="make"
      />
      
      <ContentContainer>
        {assetType === 'token' ? <LaunchPage embedded="true" /> : <LaunchNFTPage embedded="true" />}
      </ContentContainer>
    </PageContainer>
  );
};

export default MakePage; 