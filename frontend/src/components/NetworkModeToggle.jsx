import React, { useState } from 'react';
import styled from 'styled-components';
import { useNetworkMode } from '../contexts/NetworkModeContext';

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  width: 260px;
  justify-content: flex-start;
  padding: 4px;
`;

const ToggleLabel = styled.span`
  font-size: 15px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-right: 16px;
  flex-shrink: 0;
`;

const ToggleSwitch = styled.div`
  position: relative;
  width: 160px;
  height: 32px;
  background: ${props => 
    props.$active ? 'linear-gradient(135deg, #4A9FFF 0%, #A269FF 100%)' : 'var(--bg-secondary)'};
  border-radius: 16px;
  cursor: ${props => props.$switching ? 'wait' : 'pointer'};
  transition: all 0.3s ease;
  flex-shrink: 0;
  border: 1px solid ${props => props.$active ? 'transparent' : 'var(--border)'};
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
  overflow: hidden;
  
  min-width: 160px;
  max-width: 160px;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  }
`;

const ToggleKnob = styled.div`
  position: absolute;
  top: 2px;
  left: ${props => props.$active ? 'calc(50% - 2px)' : '2px'};
  width: calc(50% - 4px);
  height: 28px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 14px;
  transition: all 0.3s ease;
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  z-index: 1;
  
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
      border: 2px solid #FFFFFF;
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
  font-weight: ${props => props.$active ? '600' : '500'};
  color: white;
  width: 50%;
  text-align: center;
  z-index: 2;
  position: relative;
  transition: all 0.3s ease;
  opacity: ${props => props.$active ? 1 : 0.65};
  pointer-events: none;
  text-shadow: ${props => props.$active ? '0 0 8px rgba(255, 255, 255, 0.3)' : 'none'};
  transform: ${props => props.$active ? 'scale(1.05)' : 'scale(1)'};
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
        <NetworkModeText $active={!isMainnet}>Test</NetworkModeText>
        <NetworkModeText $active={isMainnet}>Main</NetworkModeText>
        <ToggleKnob $active={isMainnet} $switching={isSwitching} />
      </ToggleSwitch>
    </ToggleContainer>
  );
};

export default NetworkModeToggle; 