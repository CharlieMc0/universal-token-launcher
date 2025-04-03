import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import NetworkModeToggle from '../NetworkModeToggle';

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

const MainNav = styled.nav`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0 auto;
  padding: 8px;
  background: rgba(18, 18, 26, 0.7);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  border: 1px solid var(--border);
`;

const NavAction = styled(Link)`
  background: ${props => props.active ? 'var(--card-bg)' : 'transparent'};
  color: ${props => props.active ? 'var(--text-primary)' : 'var(--text-secondary)'};
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
  text-decoration: none;
  
  &:hover {
    background: ${props => props.active ? 'var(--card-bg)' : 'rgba(255, 255, 255, 0.05)'};
    transform: translateY(-1px);
  }
`;

const ActionsContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
  min-width: 280px;
`;

const WalletContainer = styled.div`
  height: 40px;
  width: 100%;
  display: flex;
  justify-content: flex-end;
`;

const NetworkToggleWrapper = styled.div`
  width: 100%;
  display: flex;
  justify-content: flex-end;
  padding: 0 4px;
`;

const Header = () => {
  const location = useLocation();
  const isMakePage = location.pathname === '/make';
  const isMovePage = location.pathname === '/move';
  
  return (
    <HeaderContainer>
      <LogoContainer to="/">
        <Logo>Universal <LogoHighlight>Launcher</LogoHighlight></Logo>
      </LogoContainer>
      
      <MainNav>
        <NavAction to="/make" active={isMakePage ? 1 : 0}>
          Make
        </NavAction>
        <NavAction to="/move" active={isMovePage ? 1 : 0}>
          Move
        </NavAction>
      </MainNav>
      
      <ActionsContainer>
        <WalletContainer>
          <ConnectButton />
        </WalletContainer>
        <NetworkToggleWrapper>
          <NetworkModeToggle />
        </NetworkToggleWrapper>
      </ActionsContainer>
    </HeaderContainer>
  );
};

export default Header; 