import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  margin-bottom: 24px;
  width: 100%;
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: var(--text-secondary);
`;

const TileGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
  margin-top: 8px;
`;

const ChainTile = styled.div`
  position: relative;
  background: ${props => props.$selected ? 'var(--accent-primary-transparent)' : 'var(--bg-primary)'};
  border: 2px solid ${props => props.$selected ? 'var(--accent-primary)' : 'var(--border)'};
  border-radius: 12px;
  padding: 16px;
  cursor: ${props => props.$disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.$disabled ? 0.6 : 1};
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;

  &:hover {
    ${props => !props.$disabled && `
      border-color: var(--accent-primary);
      transform: translateY(-2px);
    `}
  }
`;

const ChainLogo = styled.img`
  width: 48px;
  height: 48px;
  margin-bottom: 12px;
  border-radius: 50%;
  background-color: #fff;
`;

const ChainName = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 4px;
`;

const ComingSoonBadge = styled.div`
  font-size: 12px;
  color: var(--text-secondary);
  font-style: italic;
`;

const HelperText = styled.div`
  font-size: 12px;
  margin-top: 8px;
  color: ${props => props.$error ? 'var(--error)' : 'var(--text-secondary)'};
`;

// Chain logo mapping with public URLs
const chainLogos = {
  '7001': '/chain-logos/zetachain.svg',
  '11155111': '/chain-logos/ethereum.svg',
  '97': '/chain-logos/bsc.svg',
  '84532': '/chain-logos/base.svg',
  'solana': '/chain-logos/solana.svg',
  'sui': '/chain-logos/sui.svg',
  'ton': '/chain-logos/ton.svg'
};

const ChainSelector = ({
  label,
  options = [],
  value = [],
  onChange,
  helperText,
  error
}) => {
  const handleTileClick = (chainValue, disabled) => {
    if (disabled) return;
    
    // ZetaChain is required and cannot be deselected
    if (chainValue === '7001') {
      return;
    }

    let newValue;
    if (value.includes(chainValue)) {
      // Allow deselecting any chain except ZetaChain
      newValue = value.filter(v => v !== chainValue);
    } else {
      newValue = [...value, chainValue];
    }

    onChange({
      target: {
        name: 'chains',
        value: newValue
      }
    });
  };

  return (
    <Container>
      {label && <Label>{label}</Label>}
      <TileGrid>
        {options.map((chain) => (
          <ChainTile
            key={chain.value}
            $selected={value.includes(chain.value)}
            $disabled={chain.disabled}
            onClick={() => handleTileClick(chain.value, chain.disabled)}
          >
            <ChainLogo 
              src={chainLogos[chain.value]} 
              alt={`${chain.label} logo`}
            />
            <ChainName>{chain.label}</ChainName>
            {chain.comingSoon && (
              <ComingSoonBadge>Coming Soon</ComingSoonBadge>
            )}
          </ChainTile>
        ))}
      </TileGrid>
      {(helperText || error) && (
        <HelperText $error={error}>
          {error || helperText}
        </HelperText>
      )}
    </Container>
  );
};

export default ChainSelector; 