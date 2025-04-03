import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { isValidAddress } from '../utils/csvParser';

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

const AddressTextArea = styled.textarea`
  width: 100%;
  min-height: 120px;
  background-color: var(--bg-primary);
  border: 1px solid ${props => props.$error ? 'var(--error)' : 'var(--border)'};
  color: var(--text-primary);
  padding: 14px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-family: monospace;
  resize: vertical;
  outline: none;
  transition: all 0.2s ease;
  
  &:focus {
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 1px var(--accent-primary);
  }
  
  &::placeholder {
    color: var(--text-secondary);
    opacity: 0.6;
  }
`;

const AmountInput = styled.input`
  width: 100%;
  background-color: var(--bg-primary);
  border: 1px solid ${props => props.$error ? 'var(--error)' : 'var(--border)'};
  color: var(--text-primary);
  padding: 14px 16px;
  border-radius: 8px;
  font-size: 16px;
  outline: none;
  margin-top: 16px;
  transition: all 0.2s ease;
  
  &:focus {
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 1px var(--accent-primary);
  }
  
  &::placeholder {
    color: var(--text-secondary);
    opacity: 0.6;
  }
`;

const ValidationSummary = styled.div`
  margin-top: 8px;
  font-size: 14px;
  color: ${props => props.$error ? 'var(--error)' : 'var(--accent-secondary)'};
`;

const HelperText = styled.div`
  font-size: 12px;
  margin-top: 6px;
  color: ${props => props.$error ? 'var(--error)' : 'var(--text-secondary)'};
`;

const DistributionInput = ({ 
  onDistributionsChange,
  chainId = '7001',
  error,
  helperText 
}) => {
  const [addresses, setAddresses] = useState('');
  const [amount, setAmount] = useState('');
  const [validation, setValidation] = useState({
    totalAddresses: 0,
    validAddresses: 0,
    errors: []
  });

  useEffect(() => {
    validateAndUpdate();
  }, [addresses, amount]);

  const validateAndUpdate = () => {
    const addressList = addresses
      .split('\n')
      .map(addr => addr.trim())
      .filter(addr => addr !== '');

    const parsedAmount = parseFloat(amount);
    const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;

    const validationResult = {
      totalAddresses: addressList.length,
      validAddresses: 0,
      errors: []
    };

    // Validate addresses
    const validDistributions = addressList
      .map((addr, index) => {
        if (!isValidAddress(addr)) {
          validationResult.errors.push(`Line ${index + 1}: Invalid address "${addr}"`);
          return null;
        }
        validationResult.validAddresses++;
        
        // Return object with proper field names for the Launch component
        return {
          address: addr, // Using 'address' instead of 'recipient_address'
          amount: amount ? amount.toString() : "0", // Ensure amount is always a string
          chain_id: chainId
        };
      })
      .filter(Boolean);

    // Validate amount
    if (!isValidAmount) {
      validationResult.errors.push('Invalid amount. Please enter a positive number.');
    }

    setValidation(validationResult);

    // Only update parent if we have valid addresses and a valid amount
    if (validationResult.validAddresses > 0 && isValidAmount) {
      onDistributionsChange(validDistributions);
    } else {
      onDistributionsChange([]);
    }
  };

  return (
    <Container>
      <Label>Recipient Addresses (one per line)</Label>
      <AddressTextArea
        value={addresses}
        onChange={(e) => setAddresses(e.target.value)}
        placeholder="0x1234...&#13;&#10;0x5678...&#13;&#10;0xabcd..."
        $error={validation.errors.length > 0}
      />
      
      <AmountInput
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount per address"
        min="0"
        $error={validation.errors.some(err => err.includes('amount'))}
      />
      
      {validation.totalAddresses > 0 && (
        <ValidationSummary $error={validation.errors.length > 0}>
          {validation.errors.length === 0 
            ? `✓ ${validation.validAddresses} valid addresses`
            : `${validation.validAddresses} valid out of ${validation.totalAddresses} addresses`
          }
        </ValidationSummary>
      )}
      
      {validation.errors.map((error, index) => (
        <HelperText key={index} $error>
          {error}
        </HelperText>
      ))}
      
      {helperText && <HelperText>{helperText}</HelperText>}
    </Container>
  );
};

export default DistributionInput; 