import React from 'react';
import styled from 'styled-components';
import { CheckCircleIcon, ClockIcon, XCircleIcon, LinkIcon } from '@heroicons/react/24/solid'; // Assuming you have heroicons

// --- Mock Data & Types (Replace with actual data structure if different) ---
// Example log structure based on backend docs:
// {
//   id: number;
//   token_config_id: number;
//   chain_name: string;
//   chain_id: string;
//   contract_address: string;
//   status: 'success' | 'failure' | 'pending'; // Deployment status
//   transaction_hash: string;
//   error_message: string | null;
//   verificationStatus: 'verified' | 'pending' | 'processing' | 'failed' | 'skipped';
//   verificationError: string | null;
//   verifiedUrl: string | null; // URL to verified contract on explorer
//   createdAt: string;
//   updatedAt: string;
// }

// --- Styled Components ---

const ConfirmationContainer = styled.div`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 32px;
  margin-top: 32px;
  text-align: center;
`;

const Title = styled.h2`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 16px;
  color: var(--success); // Use success color
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
`;

const Subtitle = styled.p`
  font-size: 16px;
  color: var(--text-secondary);
  margin-bottom: 32px;
`;

const TokenInfo = styled.div`
  margin-bottom: 32px;
  padding: 16px;
  background-color: rgba(var(--accent-primary-rgb), 0.05);
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-primary-rgb), 0.1);
  display: inline-block; // Center the block itself
`;

const TokenIdLabel = styled.span`
  font-weight: 600;
  color: var(--text-secondary);
`;

const TokenIdValue = styled.span`
  font-family: monospace;
  font-weight: 500;
  color: var(--text-primary);
  margin-left: 8px;
`;


const DeploymentList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  text-align: left;
`;

const DeploymentItem = styled.li`
  background-color: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  border: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap; // Allow wrapping on smaller screens
  gap: 12px;
`;

const ChainInfo = styled.div`
  flex-grow: 1;
`;

const ChainName = styled.span`
  font-weight: 600;
  font-size: 18px;
  color: var(--text-primary);
  display: block;
  margin-bottom: 4px;
`;

const ContractAddress = styled.span`
  font-family: monospace;
  font-size: 14px;
  color: var(--text-secondary);
  word-break: break-all; // Ensure long addresses wrap
`;

const StatusSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end; // Align status to the right
  min-width: 150px; // Ensure enough space for status/link
`;

const VerificationBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  margin-bottom: 8px; // Space between badge and explorer link

  &.verified {
    background-color: rgba(var(--success-rgb), 0.1);
    color: var(--success);
  }
  &.pending, &.processing {
    background-color: rgba(var(--warning-rgb), 0.1);
    color: var(--warning);
  }
  &.failed, &.skipped {
    background-color: rgba(var(--error-rgb), 0.1);
    color: var(--error);
  }
`;

const ExplorerLink = styled.a`
  color: var(--accent-primary);
  text-decoration: none;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.8;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const IconWrapper = styled.span`
  svg {
    width: 1em;
    height: 1em;
    vertical-align: -0.125em; // Align icons better with text
  }
`;

const ActionButton = styled.button`
  background-color: var(--accent-primary);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-top: 32px;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    background-color: #666;
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

// --- Helper Functions ---

// Basic utility to get explorer URL if verifiedUrl is missing (expand as needed)
const getFallbackExplorerUrl = (chainId, contractAddress) => {
  // TODO: Add more chain mappings
  switch (chainId?.toString()) {
    case '7001': // ZetaChain Athens
      return `https://explorer.zetachain.com/address/${contractAddress}`;
    case '11155111': // Sepolia
      return `https://sepolia.etherscan.io/address/${contractAddress}`;
    case '97': // BSC Testnet
      return `https://testnet.bscscan.com/address/${contractAddress}`;
    case '84532': // Base Sepolia
      return `https://sepolia.basescan.org/address/${contractAddress}`;
    default:
      return null; // No known explorer for this chain
  }
};

// --- Component ---

const DeploymentConfirmation = ({ logs = [], tokenId, onStartNewDeployment }) => {
  if (!logs || logs.length === 0) {
    return (
      <ConfirmationContainer>
        <Title>
          <CheckCircleIcon style={{ width: '28px', height: '28px' }} />
          Deployment Initiated
        </Title>
        <Subtitle>Waiting for deployment details...</Subtitle>
        {tokenId && (
          <TokenInfo>
            <TokenIdLabel>Token ID:</TokenIdLabel>
            <TokenIdValue>{tokenId}</TokenIdValue>
          </TokenInfo>
        )}
      </ConfirmationContainer>
    );
  }

  const successfulDeployments = logs.filter(log => log.status === 'success' || log.status === 'deployed');

  return (
    <ConfirmationContainer>
      <Title>
        <CheckCircleIcon style={{ width: '28px', height: '28px' }} />
        Deployment Successful!
      </Title>
      <Subtitle>Your universal token contracts have been deployed.</Subtitle>

      {tokenId && (
        <TokenInfo>
          <TokenIdLabel>Token ID:</TokenIdLabel>
          <TokenIdValue>{tokenId}</TokenIdValue>
        </TokenInfo>
      )}

      <DeploymentList>
        {successfulDeployments.map((log) => {
          const explorerUrl = log.verifiedUrl || getFallbackExplorerUrl(log.chainId, log.contractAddress);
          let verificationStatusText = log.verificationStatus || 'Unknown';
          let VerificationIcon = ClockIcon; // Default to pending/processing style

          switch (log.verificationStatus?.toLowerCase()) {
            case 'verified':
              verificationStatusText = 'Verified';
              VerificationIcon = CheckCircleIcon;
              break;
            case 'pending':
              verificationStatusText = 'Verification Pending';
              VerificationIcon = ClockIcon;
              break;
            case 'processing':
              verificationStatusText = 'Verification Processing';
              VerificationIcon = ClockIcon; // Or a spinner icon if you have one
              break;
            case 'failed':
              verificationStatusText = 'Verification Failed';
              VerificationIcon = XCircleIcon;
              break;
            case 'skipped':
              verificationStatusText = 'Verification Skipped';
              VerificationIcon = XCircleIcon;
              break;
            default:
               VerificationIcon = ClockIcon;
          }

          return (
            <DeploymentItem key={log.id || `${log.chainId}-${log.contractAddress}`}>
              <ChainInfo>
                <ChainName>{log.chainName || `Chain ID: ${log.chainId}`}</ChainName>
                <ContractAddress>{log.contractAddress || 'N/A'}</ContractAddress>
              </ChainInfo>
              <StatusSection>
                <VerificationBadge className={log.verificationStatus?.toLowerCase() || 'pending'}>
                  <IconWrapper>
                    <VerificationIcon style={{ width: '14px', height: '14px' }} />
                  </IconWrapper>
                  {verificationStatusText}
                </VerificationBadge>
                {explorerUrl && (
                  <ExplorerLink href={explorerUrl} target="_blank" rel="noopener noreferrer">
                    <LinkIcon />
                    View on Explorer
                  </ExplorerLink>
                )}
              </StatusSection>
            </DeploymentItem>
          );
        })}
      </DeploymentList>

      {onStartNewDeployment && typeof onStartNewDeployment === 'function' && (
         <ActionButton onClick={onStartNewDeployment}>
           Launch Another Token
         </ActionButton>
      )}
    </ConfirmationContainer>
  );
};

export default DeploymentConfirmation; 