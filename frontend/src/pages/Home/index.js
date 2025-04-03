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

const ActionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  max-width: 800px;
  width: 100%;
  margin-top: 20px;
`;

const ActionCard = styled(Link)`
  background-color: ${props => props.primary ? 'var(--accent-primary)' : 'transparent'};
  color: white;
  border: 1px solid ${props => props.primary ? 'var(--accent-primary)' : 'var(--border)'};
  padding: 32px 20px;
  border-radius: 12px;
  text-align: center;
  text-decoration: none;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  
  ${props => props.disabled && `
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
    position: relative;
  `}
  
  &:hover {
    transform: ${props => props.disabled ? 'none' : 'translateY(-4px)'};
    box-shadow: ${props => props.disabled ? 'none' : '0 8px 16px rgba(0, 0, 0, 0.2)'};
    background-color: ${props => props.primary ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)'};
  }
`;

const ActionIcon = styled.div`
  font-size: 32px;
  margin-bottom: 16px;
`;

const ActionTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 8px;
`;

const ActionDescription = styled.p`
  font-size: 14px;
  color: ${props => props.primary ? 'rgba(255, 255, 255, 0.8)' : 'var(--text-secondary)'};
`;

const ComingSoonBadge = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(255, 255, 255, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
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
          Manage Universal Tokens & NFTs across <Highlight>Multiple Chains</Highlight>
        </HeroTitle>
        <HeroSubtitle>
          The Universal Launcher allows you to configure and deploy tokens and NFTs on multiple chains with a single transaction, powered by ZetaChain's cross-chain technology.
        </HeroSubtitle>
        
        <ActionGrid>
          <ActionCard to="/make">
            <ActionIcon>🚀</ActionIcon>
            <ActionTitle>Make</ActionTitle>
            <ActionDescription>Launch tokens or NFT collections that work seamlessly across multiple blockchains</ActionDescription>
          </ActionCard>
          
          <ActionCard to="/move">
            <ActionIcon>⛓️</ActionIcon>
            <ActionTitle>Move</ActionTitle>
            <ActionDescription>Move your tokens and NFTs between any supported blockchain networks</ActionDescription>
          </ActionCard>
          
          <ActionCard to="/buy" disabled>
            <ComingSoonBadge>Coming Soon</ComingSoonBadge>
            <ActionIcon>💰</ActionIcon>
            <ActionTitle>Buy</ActionTitle>
            <ActionDescription>Purchase NFTs using cross-chain assets and see your upcoming token marketplace</ActionDescription>
          </ActionCard>
        </ActionGrid>
      </HeroSection>

      <FeaturesSection>
        <SectionTitle>Why Use Universal Launcher</SectionTitle>
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

          <FeatureCard>
            <FeatureIcon>🖼️</FeatureIcon>
            <FeatureTitle>Universal NFTs</FeatureTitle>
            <FeatureText>
              Create NFT collections that work seamlessly across multiple blockchains.
            </FeatureText>
          </FeatureCard>
          
          <FeatureCard>
            <FeatureIcon>💰</FeatureIcon>
            <FeatureTitle>Multi-Asset Purchase</FeatureTitle>
            <FeatureText>
              Buy NFTs using any ZRC20 asset, including Bitcoin, and mint on your preferred chain.
            </FeatureText>
          </FeatureCard>
        </FeatureGrid>
      </FeaturesSection>
    </>
  );
};

export default HomePage; 