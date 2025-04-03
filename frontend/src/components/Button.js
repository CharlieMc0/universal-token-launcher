import React from 'react';
import styled, { css } from 'styled-components';

const baseButtonStyles = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14px 32px;
  border-radius: var(--radius-sm, 8px);
  font-size: 16px;
  font-weight: 600; /* Slightly bolder than default */
  cursor: pointer;
  border: 2px solid transparent; /* Base border for consistent sizing */
  transition: all 0.2s ease-in-out;
  line-height: 1.2; /* Prevent text jumping on wrap */
  white-space: nowrap; /* Prevent text wrapping */
  height: 48px; /* Add consistent height */
  box-sizing: border-box; /* Ensure padding doesn't affect height */

  &:focus-visible {
    outline: 2px solid var(--accent-primary);
    outline-offset: 2px;
  }

  &:hover {
    transform: scale(1.03);
    filter: brightness(1.1);
  }

  &:active {
    transform: scale(0.98);
    filter: brightness(0.95);
  }
`;

const primaryStyles = css`
  background-color: var(--accent-primary);
  color: var(--text-primary);
  border-color: var(--accent-primary);

  &:hover {
    background-color: var(--accent-primary); /* Maintain color on hover */
    border-color: var(--accent-primary);
    transform: scale(1.03);
    filter: brightness(1.1);
  }

  &:active {
    background-color: var(--accent-primary);
    border-color: var(--accent-primary);
    transform: scale(0.98);
    filter: brightness(0.9);
  }
`;

const secondaryStyles = css`
  background-color: transparent;
  color: var(--accent-primary);
  border-color: var(--accent-primary);

  &:hover {
    background-color: rgba(60, 157, 242, 0.1); /* Subtle blue background */
    border-color: var(--accent-primary);
    transform: scale(1.03);
    filter: brightness(1.1);
  }

  &:active {
    background-color: rgba(60, 157, 242, 0.2);
    border-color: var(--accent-primary);
    transform: scale(0.98);
    filter: brightness(0.9);
  }
`;

const disabledStyles = css`
  background-color: var(--border);
  color: var(--text-secondary);
  border-color: var(--border);
  cursor: not-allowed;
  opacity: 0.6;

  /* Disable hover/active effects for disabled buttons */
  &:hover,
  &:active {
    transform: none;
    filter: none;
  }
`;

const StyledButton = styled.button`
  ${baseButtonStyles}

  /* Apply variant styles */
  ${({ variant }) => variant === 'primary' && primaryStyles}
  ${({ variant }) => variant === 'secondary' && secondaryStyles}

  /* Apply disabled styles if disabled prop is true */
  ${({ disabled }) => disabled && disabledStyles}
`;

const Button = ({ children, variant = 'primary', disabled = false, ...props }) => {
  return (
    <StyledButton variant={variant} disabled={disabled} {...props}>
      {children}
    </StyledButton>
  );
};

export default Button; 