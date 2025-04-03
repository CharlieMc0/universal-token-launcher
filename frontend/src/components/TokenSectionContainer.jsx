import React from 'react';
import styled from 'styled-components';

// Styled components for token section containers
const Container = styled.div`
  margin-bottom: 32px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  
  &::before {
    content: '';
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${props => props.isOwner ? 'var(--accent-secondary)' : 'var(--accent-primary)'};
    margin-right: 8px;
  }
`;

const Title = styled.h3`
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
`;

/**
 * Token Section Container
 * 
 * Used to group tokens into sections like "Your Deployed Tokens" or "Your Token Holdings"
 * Features a visually distinct header with a colored dot indicator
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Section title
 * @param {boolean} props.isOwner - Whether this section contains owned/deployed tokens
 * @param {React.ReactNode} props.children - Child components (token cards)
 */
const TokenSectionContainer = ({ title, isOwner = false, children }) => {
  return (
    <Container>
      <Header isOwner={isOwner}>
        <Title>{title}</Title>
      </Header>
      {children}
    </Container>
  );
};

export default TokenSectionContainer; 