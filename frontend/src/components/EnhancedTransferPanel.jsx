import React, { useEffect } from 'react';
import styled from 'styled-components';
import FormInput from './FormInput';
import { chainLogos, chainNames } from './TokenTile';
import { formatTokenBalance } from '../utils/tokenUtils';

// Styled components for the enhanced transfer panel
const TransferBox = styled.div`
  position: fixed;
  top: 100px;
  right: 24px;
  width: 380px;
  background-color: var(--card-bg);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  padding: 24px;
  z-index: 100;
  max-height: calc(100vh - 150px);
  overflow-y: auto;
  border: 2px solid var(--accent-primary);
  transition: transform 0.3s ease-in-out, opacity 0.3s ease-in-out;
  transform: ${props => props.show ? 'translateX(0)' : 'translateX(20px)'};
  opacity: ${props => props.show ? '1' : '0'};
  pointer-events: ${props => props.show ? 'auto' : 'none'};
  
  @media (max-width: 1200px) {
    position: static;
    width: 100%;
    margin-top: 24px;
    max-height: none;
    transform: none;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 24px;
  cursor: pointer;
  line-height: 1;
  
  &:hover {
    color: var(--accent-primary);
  }
`;

const TransferTitle = styled.h3`
  font-size: 20px;
  margin: 0 0 20px 0;
  color: var(--text-primary);
  padding-right: 20px;
`;

const SelectedTokenDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: rgba(60, 157, 242, 0.1);
  border-radius: 8px;
  margin-bottom: 20px;
`;

const TokenIconWrapper = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.color || '#3C9DF2'};
`;

const TokenIcon = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
`;

const TokenIconPlaceholder = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: ${props => props.color || '#3C9DF2'};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 16px;
`;

const TokenDetails = styled.div`
  display: flex;
  flex-direction: column;
`;

const TokenName = styled.span`
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
`;

const TokenBalance = styled.span`
  font-size: 14px;
  color: var(--text-secondary);
`;

const TransferSteps = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 24px;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 12px;
    left: 24px;
    right: 24px;
    height: 2px;
    background-color: var(--border);
    z-index: 0;
  }
`;

const TransferStep = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 1;
`;

const StepIndicator = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: ${props => props.active || props.completed ? 'var(--accent-primary)' : 'var(--card-bg)'};
  border: 2px solid ${props => props.completed ? 'var(--accent-secondary)' : props.active ? 'var(--accent-primary)' : 'var(--border)'};
  color: ${props => props.active || props.completed ? 'white' : 'var(--text-secondary)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
`;

const StepLabel = styled.span`
  font-size: 12px;
  color: ${props => props.active ? 'var(--text-primary)' : 'var(--text-secondary)'};
  font-weight: ${props => props.active ? 500 : 400};
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--text-primary);
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background-color: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
  font-size: 16px;
  
  &:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 1px var(--accent-primary-transparent);
  }
  
  &::placeholder {
    color: var(--text-secondary);
  }
`;

const QuickAmountButtons = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 8px;
`;

const QuickAmountButton = styled.button`
  background-color: rgba(60, 157, 242, 0.1);
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  color: var(--accent-primary);
  cursor: pointer;
  
  &:hover {
    background-color: rgba(60, 157, 242, 0.2);
  }
`;

const ActionButton = styled.button`
  width: 100%;
  background-color: var(--accent-primary);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 16px;
  
  &:hover {
    background-color: var(--accent-primary-hover, #2a7ecc);
  }
  
  &:disabled {
    background-color: #555;
    cursor: not-allowed;
  }
`;

const ChainOptionGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-top: 8px;
`;

const ChainOption = styled.div`
  border: 2px solid ${props => props.selected ? 'var(--accent-primary)' : 'var(--border)'};
  background-color: ${props => props.selected ? 'rgba(60, 157, 242, 0.1)' : 'transparent'};
  border-radius: 8px;
  padding: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: var(--accent-primary-transparent);
    background-color: rgba(60, 157, 242, 0.05);
  }
`;

const ChainLogo = styled.img`
  width: 20px;
  height: 20px;
`;

const ChainName = styled.span`
  font-size: 14px;
  color: var(--text-primary);
`;

const SelectedSourceChain = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  background-color: rgba(60, 157, 242, 0.1);
  border-radius: 8px;
  margin-bottom: 20px;
`;

const SourceBalance = styled.span`
  font-size: 14px;
  color: var(--text-secondary);
`;

/**
 * Enhanced Transfer Panel Component
 * 
 * Provides an improved UI for token transfers with step indicators,
 * quick amount buttons, and a cleaner layout
 * 
 * @param {Object} props - Component props
 * @param {boolean} props.show - Whether to show the transfer panel
 * @param {Object} props.token - Token being transferred
 * @param {string} props.activeStep - Current step ('source', 'amount', 'destination')
 * @param {Object} props.formData - Transfer form data
 * @param {Function} props.onClose - Callback when panel is closed
 * @param {Function} props.onAmountChange - Callback when amount changes
 * @param {Function} props.onQuickAmount - Callback when quick amount button is clicked
 * @param {Function} props.onChainSelect - Callback when destination chain is selected
 * @param {Function} props.onRecipientChange - Callback when recipient address changes
 * @param {Function} props.onSubmit - Callback when transfer is submitted
 * @param {Array} props.availableChains - Available destination chains
 * @param {boolean} props.isTransferring - Whether the transfer is in progress
 */
const EnhancedTransferPanel = ({
  show = false,
  token,
  activeStep = 'source',
  formData = {},
  onClose,
  onAmountChange,
  onQuickAmount,
  onChainSelect,
  onRecipientChange,
  onSubmit,
  availableChains = [],
  isTransferring = false
}) => {
  // Initialize validSourceChains safely using optional chaining
  const validSourceChains = token?.chainInfo ? token.chainInfo.filter(chain => chain.balance && chain.balance !== '0') : [];

  // Automatically select source chain if only one option is available
  useEffect(() => {
    if (token && activeStep === 'source' && !formData.sourceChain && validSourceChains.length === 1 && typeof onChainSelect === 'function') {
      onChainSelect(validSourceChains[0].chain_id || validSourceChains[0].chainId, 'source');
    }
  }, [token, activeStep, formData.sourceChain, validSourceChains, onChainSelect]);

  if (!token) return null;

  // Determine which steps are completed or active
  const isSourceCompleted = activeStep === 'amount' || activeStep === 'destination';
  const isAmountCompleted = activeStep === 'destination';
  
  // Handle amount input change
  const handleAmountChange = (e) => {
    if (typeof onAmountChange === 'function') {
      onAmountChange(e.target.value);
    }
  };
  
  // Handle quick amount selection
  const handleQuickAmount = (percentage) => {
    if (typeof onQuickAmount === 'function') {
      onQuickAmount(percentage);
    }
  };
  
  // Handle recipient address change
  const handleRecipientChange = (e) => {
    if (typeof onRecipientChange === 'function') {
      onRecipientChange(e.target.value);
    }
  };
  
  // Handle chain selection
  const handleChainSelect = (chainId) => {
    if (typeof onChainSelect === 'function') {
      onChainSelect(chainId);
    }
  };
  
  // Handle transfer submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (typeof onSubmit === 'function') {
      onSubmit();
    }
  };
  
  return (
    <TransferBox show={show}>
      <CloseButton onClick={onClose}>×</CloseButton>
      <TransferTitle>Transfer {token.name}</TransferTitle>
      
      <SelectedTokenDisplay>
        <TokenIconWrapper>
          {token.iconUrl ? (
            <TokenIcon src={token.iconUrl} alt={token.name} />
          ) : (
            <TokenIconPlaceholder>
              {token.symbol?.[0] || token.name?.[0] || '?'}
            </TokenIconPlaceholder>
          )}
        </TokenIconWrapper>
        <TokenDetails>
          <TokenName>{token.name} ({token.symbol})</TokenName>
          <TokenBalance>
            Balance: {formData.sourceBalance} {token.symbol}
          </TokenBalance>
        </TokenDetails>
      </SelectedTokenDisplay>
      
      <TransferSteps>
        <TransferStep>
          <StepIndicator active={activeStep === 'source'} completed={isSourceCompleted}>1</StepIndicator>
          <StepLabel active={activeStep === 'source' || isSourceCompleted}>Source</StepLabel>
        </TransferStep>
        <TransferStep>
          <StepIndicator active={activeStep === 'amount'} completed={isAmountCompleted}>2</StepIndicator>
          <StepLabel active={activeStep === 'amount' || isAmountCompleted}>Amount</StepLabel>
        </TransferStep>
        <TransferStep>
          <StepIndicator active={activeStep === 'destination'}>3</StepIndicator>
          <StepLabel active={activeStep === 'destination'}>Destination</StepLabel>
        </TransferStep>
      </TransferSteps>
      
      <form onSubmit={handleSubmit}>
        {activeStep === 'source' && (
          <>
            <FormGroup>
              <Label>Select Source Chain</Label>
              <ChainOptionGrid>
                {token.chainInfo
                  .filter(chain => chain.balance && chain.balance !== '0')
                  .map(chain => (
                    <ChainOption 
                      key={chain.chain_id || chain.chainId}
                      selected={formData.sourceChain === (chain.chain_id || chain.chainId)}
                      onClick={() => {
                        if (typeof onChainSelect === 'function') {
                          // We're reusing the onChainSelect for source selection too
                          onChainSelect(chain.chain_id || chain.chainId, 'source');
                        }
                      }}
                    >
                      <ChainLogo 
                        src={chainLogos[chain.chain_id || chain.chainId] || '/chain-logos/zetachain.svg'} 
                        alt={chainNames[chain.chain_id || chain.chainId] || 'Chain'} 
                      />
                      <div>
                        <ChainName>{chainNames[chain.chain_id || chain.chainId] || `Chain ${chain.chain_id || chain.chainId}`}</ChainName>
                        <SourceBalance>
                          {formatTokenBalance(chain.balance || '0', token.decimals)} {token.symbol}
                        </SourceBalance>
                      </div>
                    </ChainOption>
                  ))}
              </ChainOptionGrid>
            </FormGroup>
            <ActionButton 
              type="button" 
              onClick={() => onSubmit('next')}
              disabled={!formData.sourceChain}
            >
              Continue to Enter Amount
            </ActionButton>
          </>
        )}
        
        {activeStep === 'amount' && (
          <>
            <FormGroup>
              <Label>Transfer Amount</Label>
              <Input 
                type="text" 
                value={formData.transferAmount || ''} 
                onChange={handleAmountChange} 
                placeholder={`Enter amount (max ${formData.sourceBalance})`}
              />
              <QuickAmountButtons>
                <QuickAmountButton type="button" onClick={() => handleQuickAmount(0.25)}>25%</QuickAmountButton>
                <QuickAmountButton type="button" onClick={() => handleQuickAmount(0.5)}>50%</QuickAmountButton>
                <QuickAmountButton type="button" onClick={() => handleQuickAmount(0.75)}>75%</QuickAmountButton>
                <QuickAmountButton type="button" onClick={() => handleQuickAmount(1)}>MAX</QuickAmountButton>
              </QuickAmountButtons>
            </FormGroup>
            <ActionButton 
              type="button" 
              onClick={() => onSubmit('next')}
              disabled={!formData.transferAmount}
            >
              Continue
            </ActionButton>
          </>
        )}
        
        {activeStep === 'destination' && (
          <>
            <FormGroup>
              <Label>Destination Chain</Label>
              <ChainOptionGrid>
                {availableChains.map(chain => (
                  <ChainOption 
                    key={chain.chainId}
                    selected={formData.destinationChain === chain.chainId}
                    onClick={() => handleChainSelect(chain.chainId)}
                  >
                    <ChainLogo 
                      src={chain.logo || '/chain-logos/zetachain.svg'} 
                      alt={chain.name} 
                    />
                    <ChainName>{chain.name}</ChainName>
                  </ChainOption>
                ))}
              </ChainOptionGrid>
            </FormGroup>
            
            <FormGroup>
              <Label>Recipient Address (optional)</Label>
              <Input 
                type="text" 
                value={formData.recipientAddress || ''} 
                onChange={handleRecipientChange} 
                placeholder="Leave empty to send to yourself"
              />
            </FormGroup>
            
            <ActionButton 
              type="button" 
              onClick={() => onSubmit('submit')}
              disabled={!formData.destinationChain || isTransferring}
            >
              {isTransferring ? 'Transferring...' : 'Transfer Tokens'}
            </ActionButton>
          </>
        )}
      </form>
    </TransferBox>
  );
};

export default EnhancedTransferPanel; 