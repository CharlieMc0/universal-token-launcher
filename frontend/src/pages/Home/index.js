import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const HeroSection = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 60px 0;
`;

const HeroTitle = styled.h1`
  font-size: 48px;
  line-height: 1.2;
  max-width: 800px;
  margin-bottom: 24px;
`;

const Highlight = styled.span`
  color: var(--accent-primary);
`;

const HeroSubtitle = styled.p`
  font-size: 20px;
  max-width: 600px;
  margin-bottom: 40px;
  color: var(--text-secondary);
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 16px;
  margin-top: 16px;
`;

const PrimaryButton = styled(Link)`
  background-color: var(--accent-primary);
  color: white;
  padding: 14px 32px;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;
  
  &:hover {
    opacity: 0.9;
    transform: translateY(-2px);
  }
`;

const SecondaryButton = styled(Link)`
  background-color: transparent;
  color: white;
  padding: 14px 32px;
  border-radius: 8px;
  font-weight: 600;
  text-decoration: none;
  border: 1px solid var(--border);
  transition: all 0.2s ease;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.05);
  }
`;

const FeaturesSection = styled.section`
  padding: 80px 0;
  background-color: var(--card-bg);
  border-radius: 16px;
  margin-top: 40px;
`;

const SectionTitle = styled.h2`
  text-align: center;
  margin-bottom: 60px;
`;

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 40px;
  padding: 0 40px;
`;

const FeatureCard = styled.div`
  background-color: var(--bg-primary);
  border-radius: 12px;
  padding: 32px;
  text-align: center;
  transition: transform 0.3s ease;
  
  &:hover {
    transform: translateY(-8px);
  }
`;

const FeatureIcon = styled.div`
  font-size: 48px;
  margin-bottom: 24px;
`;

const FeatureTitle = styled.h3`
  font-size: 20px;
  margin-bottom: 16px;
  color: var(--text-primary);
`;

const FeatureText = styled.p`
  color: var(--text-secondary);
`;

const HomePage = () => {
  return (
    <>
      <HeroSection>
        <HeroTitle>
          Deploy Universal Tokens across <Highlight>Multiple Chains</Highlight>
        </HeroTitle>
        <HeroSubtitle>
          The Universal Token Launcher allows you to configure and deploy tokens on multiple chains with a single transaction, powered by ZetaChain's cross-chain technology.
        </HeroSubtitle>
        <ButtonGroup>
          <PrimaryButton to="/launch">Launch Your Token</PrimaryButton>
          <SecondaryButton to="/transfer">Transfer Tokens</SecondaryButton>
        </ButtonGroup>
      </HeroSection>

      <FeaturesSection>
        <SectionTitle>Why Use Universal Token Launcher</SectionTitle>
        <FeatureGrid>
          <FeatureCard>
            <FeatureIcon>🚀</FeatureIcon>
            <FeatureTitle>Simple Deployment</FeatureTitle>
            <FeatureText>
              Configure your token details and deploy to multiple chains with just one transaction.
            </FeatureText>
          </FeatureCard>
          
          <FeatureCard>
            <FeatureIcon>⛓️</FeatureIcon>
            <FeatureTitle>Cross-Chain Transfers</FeatureTitle>
            <FeatureText>
              Transfer tokens between chains effortlessly using our simple transfer interface.
            </FeatureText>
          </FeatureCard>
          
          <FeatureCard>
            <FeatureIcon>💸</FeatureIcon>
            <FeatureTitle>Cost Efficient</FeatureTitle>
            <FeatureText>
              Pay a single fee in ZETA to deploy your token across multiple chains.
            </FeatureText>
          </FeatureCard>
        </FeatureGrid>
      </FeaturesSection>
    </>
  );
};

export default HomePage; 