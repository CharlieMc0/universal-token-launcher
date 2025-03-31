import React from 'react';
import styled from 'styled-components';

const FooterContainer = styled.footer`
  padding: 32px 0;
  margin: 0 auto;
  width: 100%;
  max-width: 1200px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid var(--border);
`;

const CopyrightText = styled.p`
  color: var(--text-secondary);
  font-size: 14px;
  margin: 0;
`;

const FooterLinks = styled.div`
  display: flex;
  gap: 24px;
`;

const FooterLink = styled.a`
  color: var(--text-secondary);
  font-size: 14px;
  text-decoration: none;
  
  &:hover {
    color: var(--accent-primary);
  }
`;

const Footer = () => {
  return (
    <FooterContainer>
      <CopyrightText>© 2023 Universal Token Launcher. Powered by ZetaChain.</CopyrightText>
      
      <FooterLinks>
        <FooterLink href="https://zetachain.com" target="_blank" rel="noopener noreferrer">
          ZetaChain
        </FooterLink>
        <FooterLink href="https://github.com/zeta-chain/standard-contracts" target="_blank" rel="noopener noreferrer">
          Standard Contracts
        </FooterLink>
        <FooterLink href="#" target="_blank" rel="noopener noreferrer">
          Documentation
        </FooterLink>
      </FooterLinks>
    </FooterContainer>
  );
};

export default Footer; 