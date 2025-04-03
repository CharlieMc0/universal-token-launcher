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
  margin: 0 auto 40px auto; /* Keep auto margins for horizontal centering */
  position: relative;
  background-color: var(--card-bg); /* Background for the container */
  border-radius: var(--radius-sm, 8px);
  padding: 4px; /* Padding to contain the pill */
  width: fit-content; /* Keep width fitting content */
  /* Removed display: inline-flex; Let default block behavior + margin: auto handle centering */

  /* The sliding pill */
  &::before {
    content: '';
    position: absolute;
    top: 4px;
    bottom: 4px;
    left: 4px; /* Start positioned at the left padding edge */
    width: 50%; /* Assume buttons divide space equally */
    background-color: var(--accent-primary);
    border-radius: var(--radius-sm, 8px); /* Match button radius */
    transition: left 0.3s ease-in-out; /* Transition the left property */
    z-index: 1;
  }

  /* Position the pill based on activeTab */
  /* Default position is handled by left: 4px; */

  &[data-active-tab="nft"]::before {
    left: calc(50%); /* Move pill to start of the second half */
  }
`;

const ToggleButton = styled.button`
  background-color: transparent; /* Buttons are initially transparent */
  color: ${props => props.active ? 'var(--text-primary)' : 'var(--text-secondary)'}; /* Active text is brighter */
  border: none; /* Remove border */
  border-radius: var(--radius-sm, 8px); /* Keep radius */
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.3s ease-in-out; /* Transition text color */
  position: relative; /* Needed for z-index */
  z-index: 2; /* Ensure text is above the pill */
  flex: 1; /* Allow buttons to take equal space */
  text-align: center; /* Center text within button */
  
  &:hover {
    color: var(--text-primary); /* Text brightens on hover */
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
      
      <ToggleContainer data-active-tab={activeTab}>
        <ToggleButton 
          active={activeTab === 'token'} 
          onClick={() => setActiveTab('token')}
        >
          Create Token
        </ToggleButton>
        <ToggleButton 
          active={activeTab === 'nft'} 
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