import React, { useState } from 'react';
import styled from 'styled-components';
import LaunchPage from '../Launch';
import LaunchNFTPage from '../LaunchNFT';

// Styled Components
const PageContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 40px 20px;
`;

const PageTitle = styled.h1`
  margin-bottom: 32px;
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
  
  &:hover {
    background-color: ${props => props.active ? 'var(--accent-primary)' : 'rgba(60, 157, 242, 0.1)'};
  }
`;

const ContentContainer = styled.div`
  width: 100%;
`;

const CreatePage = () => {
  const [activeTab, setActiveTab] = useState('token'); // 'token' or 'nft'
  
  return (
    <PageContainer>
      <PageTitle>Create Digital Assets</PageTitle>
      <PageDescription>
        Launch tokens or NFT collections that work seamlessly across multiple blockchains with ZetaChain technology.
      </PageDescription>
      
      <ToggleContainer>
        <ToggleButton 
          active={activeTab === 'token'} 
          position="left"
          onClick={() => setActiveTab('token')}
        >
          Create Token
        </ToggleButton>
        <ToggleButton 
          active={activeTab === 'nft'} 
          position="right"
          onClick={() => setActiveTab('nft')}
        >
          Create NFT Collection
        </ToggleButton>
      </ToggleContainer>
      
      <ContentContainer>
        {activeTab === 'token' ? <LaunchPage embedded="true" /> : <LaunchNFTPage embedded="true" />}
      </ContentContainer>
    </PageContainer>
  );
};

export default CreatePage; 