import React, { useState } from 'react';
import styled from 'styled-components';
import { useNetworkMode } from '../contexts/NetworkModeContext';

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  width: 220px;
  justify-content: space-between;
  padding: 4px;
`;

const ToggleLabel = styled.span`
  font-size: 15px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-right: 12px;
  flex-shrink: 0;
`;

const ToggleSwitch = styled.div`
  position: relative;
  width: 120px;
  height: 32px;
  background: ${props => 
    props.$active ? 'linear-gradient(135deg, #4A9FFF 0%, #A269FF 100%)' : 'var(--bg-secondary)'};
  border-radius: 16px;
  cursor: ${props => props.$switching ? 'wait' : 'pointer'};
  transition: background-color 0.3s ease;
  flex-shrink: 0;
  border: 1px solid ${props => props.$active ? 'transparent' : 'var(--border)'};
  
  min-width: 120px;
  max-width: 120px;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
`;

const ToggleKnob = styled.div`
  position: absolute;
  top: 4px;
  left: ${props => props.$active ? '84px' : '4px'};
  width: 22px;
  height: 22px;
  background-color: white;
  border-radius: 50%;
  transition: all 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  
  ${props => props.$switching && `
    &:after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      width: 12px;
      height: 12px;
      margin-top: -6px;
      margin-left: -6px;
      border: 2px solid #4A9FFF;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `}
`;

const NetworkModeText = styled.span`
  font-size: 14px;
  font-weight: 500;
  position: absolute;
  top: 7px;
  color: white;
  ${props => props.$mainnet ? 'right: 12px;' : 'left: 12px;'}
  width: 40px;
  text-align: ${props => props.$mainnet ? 'right' : 'left'};
  opacity: ${props => props.$active ? 1 : 0.7};
  transition: opacity 0.3s ease;
`;

const NetworkModeToggle = () => {
  const { networkMode, toggleNetworkMode } = useNetworkMode();
  const [isSwitching, setIsSwitching] = useState(false);
  const isMainnet = networkMode === 'mainnet';
  
  const handleToggle = async () => {
    if (isSwitching) return;
    
    setIsSwitching(true);
    try {
      await toggleNetworkMode();
    } finally {
      setTimeout(() => setIsSwitching(false), 1000);
    }
  };
  
  return (
    <ToggleContainer>
      <ToggleLabel>Network:</ToggleLabel>
      <ToggleSwitch onClick={handleToggle} $active={isMainnet} $switching={isSwitching}>
        <NetworkModeText $active={!isMainnet} $mainnet={false}>Test</NetworkModeText>
        <NetworkModeText $active={isMainnet} $mainnet={true}>Main</NetworkModeText>
        <ToggleKnob $active={isMainnet} $switching={isSwitching} />
      </ToggleSwitch>
    </ToggleContainer>
  );
};

export default NetworkModeToggle; 