import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const HeaderContainer = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 0;
  margin: 0 auto;
  width: 100%;
  max-width: 1200px;
`;

const LogoContainer = styled(Link)`
  display: flex;
  align-items: center;
  text-decoration: none;
  color: var(--text-primary);
`;

const Logo = styled.h1`
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
`;

const LogoHighlight = styled.span`
  color: var(--accent-primary);
  margin-left: 8px;
`;

const Navigation = styled.nav`
  display: flex;
  gap: 40px;
  align-items: center;
`;

const NavLink = styled(Link)`
  color: ${props => props.active ? 'var(--text-primary)' : 'var(--text-secondary)'};
  text-decoration: none;
  font-weight: ${props => props.active ? '600' : '500'};
  font-size: 16px;
  position: relative;
  
  &:after {
    content: '';
    position: absolute;
    width: ${props => props.active ? '100%' : '0'};
    height: 2px;
    bottom: -4px;
    left: 0;
    background-color: var(--accent-primary);
    transition: all 0.3s ease;
  }
  
  &:hover {
    color: var(--text-primary);
    
    &:after {
      width: 100%;
    }
  }
`;

const ActionsContainer = styled.div`
  display: flex;
  align-items: center;
`;

const Header = () => {
  const location = useLocation();
  
  return (
    <HeaderContainer>
      <LogoContainer to="/">
        <Logo>Universal <LogoHighlight>Token Launcher</LogoHighlight></Logo>
      </LogoContainer>
      
      <Navigation>
        <NavLink to="/" active={location.pathname === '/' ? 1 : 0}>
          Home
        </NavLink>
        <NavLink to="/launch" active={location.pathname === '/launch' ? 1 : 0}>
          Launch Token
        </NavLink>
        <NavLink to="/transfer" active={location.pathname === '/transfer' ? 1 : 0}>
          Transfer Tokens
        </NavLink>
      </Navigation>
      
      <ActionsContainer>
        <ConnectButton />
      </ActionsContainer>
    </HeaderContainer>
  );
};

export default Header; 