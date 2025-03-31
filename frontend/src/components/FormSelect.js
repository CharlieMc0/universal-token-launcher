import React from 'react';
import styled from 'styled-components';

const SelectContainer = styled.div`
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

const StyledSelect = styled.select`
  width: 100%;
  background-color: var(--bg-primary);
  border: 1px solid ${props => props.error ? 'var(--error)' : 'var(--border)'};
  color: var(--text-primary);
  padding: 14px 16px;
  border-radius: 8px;
  font-size: 16px;
  outline: none;
  transition: all 0.2s ease;
  appearance: none;
  background-image: ${props => !props.multiple && `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23B0B0B0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`};
  background-repeat: no-repeat;
  background-position: right 16px center;
  background-size: 16px;
  
  &:focus {
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 1px var(--accent-primary);
  }
  
  option {
    background-color: var(--bg-primary);
    color: var(--text-primary);
    padding: 8px;
  }
  
  option:disabled {
    color: var(--text-secondary);
    font-style: italic;
  }

  ${props => props.multiple && `
    height: auto;
    min-height: 120px;
    padding: 8px;
    
    option {
      margin: 4px 0;
      border-radius: 4px;
      
      &:checked {
        background-color: var(--accent-primary);
        color: white;
      }
    }
  `}
`;

const HelperText = styled.div`
  font-size: 12px;
  margin-top: 6px;
  color: ${props => props.error ? 'var(--error)' : 'var(--text-secondary)'};
`;

const FormSelect = ({
  label,
  id,
  options = [],
  helperText,
  error,
  multiple = false,
  ...props
}) => {
  return (
    <SelectContainer>
      {label && <Label htmlFor={id}>{label}</Label>}
      <StyledSelect 
        id={id} 
        error={error}
        multiple={multiple}
        {...props}
      >
        {options.map((option) => (
          <option 
            key={option.value} 
            value={option.value}
            disabled={option.disabled}
          >
            {option.label} {option.comingSoon ? '(Coming Soon)' : ''}
          </option>
        ))}
      </StyledSelect>
      {(helperText || error) && (
        <HelperText error={error}>
          {error || helperText}
        </HelperText>
      )}
    </SelectContainer>
  );
};

export default FormSelect; 