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
  color: var(--text-primary);
  padding: 14px 16px;
  border-radius: 8px;
  font-size: 16px;
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