import React from 'react';
import styled from 'styled-components';

const InputContainer = styled.div`
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

const StyledInput = styled.input`
  width: 100%;
  background-color: var(--bg-primary);
  border: 1px solid ${props => props.error ? 'var(--error)' : 'var(--border)'};
  box-shadow: ${props => props.error ? '0 0 0 2px rgba(255, 82, 82, 0.2)' : 'none'};
  color: var(--text-primary);
  padding: 14px 16px;
  border-radius: 8px;
  font-size: 16px;
  outline: none;
  transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  
  &:focus {
    border-color: var(--accent-primary);
    box-shadow: ${props => props.error ? '0 0 0 2px rgba(255, 82, 82, 0.2)' : '0 0 0 2px rgba(60, 157, 242, 0.3)'};
  }
  
  &::placeholder {
    color: var(--text-secondary);
    opacity: 0.6;
  }

  &:disabled {
    background-color: #2A2A2D; /* Slightly lighter grey than border */
    cursor: not-allowed;
    opacity: 0.5;
  }

  &[readonly] {
    background-color: transparent; /* Or var(--bg-primary) if preferred */
    border-style: dashed; /* Visually distinct */
    border-color: var(--border);
    cursor: default;
    &:focus {
      /* Keep readonly distinct on focus, maybe remove shadow */
      box-shadow: none;
      border-color: var(--border); 
    }
  }
`;

const HelperText = styled.div`
  font-size: 12px;
  margin-top: 6px;
  color: ${props => props.error ? 'var(--error)' : 'var(--text-secondary)'};
`;

const FormInput = ({
  label,
  id,
  helperText,
  error,
  ...props
}) => {
  return (
    <InputContainer>
      {label && <Label htmlFor={id}>{label}</Label>}
      <StyledInput 
        id={id} 
        error={error} 
        {...props} 
      />
      {(helperText || error) && (
        <HelperText error={error}>
          {error || helperText}
        </HelperText>
      )}
    </InputContainer>
  );
};

export default FormInput; 