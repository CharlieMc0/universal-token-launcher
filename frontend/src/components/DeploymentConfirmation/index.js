import React from 'react';
import styled from 'styled-components';
import { CheckCircleIcon, ClockIcon, XCircleIcon, LinkIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid'; // Assuming you have heroicons

// --- Updated Data Structure ---
// Example chainInfo structure based on backend response:
// {
//   name: string;                   // "ZetaChain Testnet"
//   chainId: string;                // "7001"
//   rpcUrl: string;                 // RPC endpoint
//   explorerUrl: string;            // Block explorer base URL
//   isZetaChain: boolean;           // Whether this is ZetaChain
//   color: string;                  // Color for UI
//   shortName: string;              // "ZetaChain"
//   isTestnet: boolean;             // Whether this is a testnet
//   isSupported: boolean;           // Whether this chain is supported
//   blockscoutUrl: string;          // Blockscout URL if applicable
//   contractAddress: string;        // Deployed contract address
//   verificationStatus: string;     // "verified", "pending", "failed"
//   verificationError: string;      // Error message if verification failed
//   verifiedUrl: string;            // Direct URL to verified contract
//   deploymentStatus: string;       // "success", "pending", "failed"
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

// --- Component ---

const DeploymentConfirmation = ({ logs = [], tokenId, onStartNewDeployment }) => {
  // If logs are empty but we have a token ID, show a pending status
  if (!logs || logs.length === 0) {
    return (
      <ConfirmationContainer>
        <Title style={{ color: 'var(--success)' }}>
          <CheckCircleIcon style={{ width: '28px', height: '28px' }} />
          Deployment Initiated!
        </Title>
        <Subtitle>
          Your token has been submitted for deployment. The backend is processing your request.
          <br />
          <br />
          <strong>Token details will appear here when available. You can check back later.</strong>
        </Subtitle>
        {tokenId && (
          <TokenInfo>
            <TokenIdLabel>Token ID:</TokenIdLabel>
            <TokenIdValue>{tokenId}</TokenIdValue>
          </TokenInfo>
        )}
        
        {/* Default chainInfo for ZetaChain when we have a token ID but no logs */}
        {tokenId && (
          <DeploymentList>
            <DeploymentItem>
              <ChainInfo>
                <ChainName>ZetaChain Athens</ChainName>
                <ContractAddress>
                  Deployment in progress... 
                </ContractAddress>
              </ChainInfo>
              <StatusSection>
                <VerificationBadge className="pending">
                  <IconWrapper>
                    <ClockIcon style={{ width: '14px', height: '14px' }} />
                  </IconWrapper>
                  Processing
                </VerificationBadge>
              </StatusSection>
            </DeploymentItem>
          </DeploymentList>
        )}
        
        <ActionButton onClick={onStartNewDeployment}>
          Launch Another Token
        </ActionButton>
      </ConfirmationContainer>
    );
  }

  // Filter the deployments based on status
  const successfulDeployments = logs.filter(chain => chain.deploymentStatus === 'success');
  const failedDeployments = logs.filter(chain => chain.deploymentStatus === 'failed');
  const pendingDeployments = logs.filter(chain => 
    chain.deploymentStatus === 'pending' || chain.deploymentStatus === 'processing'
  );

  // Determine overall deployment status
  const allFailed = logs.length > 0 && failedDeployments.length === logs.length;
  const allSuccessful = logs.length > 0 && successfulDeployments.length === logs.length;
  const mixedResults = !allFailed && !allSuccessful;

  // Choose appropriate title and icon based on deployment status
  const getTitleContent = () => {
    if (allSuccessful) {
      return (
        <>
          <CheckCircleIcon style={{ width: '28px', height: '28px' }} />
          Deployment Successful!
        </>
      );
    } else if (allFailed) {
      return (
        <>
          <XCircleIcon style={{ width: '28px', height: '28px', color: 'var(--error)' }} />
          Deployment Failed
        </>
      );
    } else {
      return (
        <>
          <ExclamationCircleIcon style={{ width: '28px', height: '28px', color: 'var(--warning)' }} />
          Partial Deployment
        </>
      );
    }
  };

  // Choose appropriate subtitle based on deployment status
  const getSubtitle = () => {
    if (allSuccessful) {
      return "Your universal token contracts have been deployed.";
    } else if (allFailed) {
      return "Token deployment failed on all chains. Please try again.";
    } else {
      return `Deployment succeeded on ${successfulDeployments.length} chain(s) and failed on ${failedDeployments.length} chain(s).`;
    }
  };

  return (
    <ConfirmationContainer>
      <Title style={{ 
        color: allSuccessful ? 'var(--success)' : allFailed ? 'var(--error)' : 'var(--warning)' 
      }}>
        {getTitleContent()}
      </Title>
      <Subtitle>{getSubtitle()}</Subtitle>

      {tokenId && (
        <TokenInfo>
          <TokenIdLabel>Token ID:</TokenIdLabel>
          <TokenIdValue>{tokenId}</TokenIdValue>
        </TokenInfo>
      )}

      <DeploymentList>
        {/* Show all deployments, not just successful ones */}
        {logs.map((chain) => {
          const explorerUrl = chain.verifiedUrl || 
            (chain.explorerUrl && chain.contractAddress ? 
              `${chain.explorerUrl}/address/${chain.contractAddress}` : null);
          
          let verificationStatusText = chain.verificationStatus || 'Unknown';
          let VerificationIcon = ClockIcon; // Default to pending/processing style
          let deploymentStatusClass = chain.deploymentStatus || 'pending';

          // Set verification status icon and text
          switch (chain.verificationStatus?.toLowerCase()) {
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
              VerificationIcon = ClockIcon;
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
            <DeploymentItem key={`${chain.chainId}-${chain.contractAddress || chain.chainId}`}>
              <ChainInfo>
                <ChainName>{chain.name || `Chain ID: ${chain.chainId}`}</ChainName>
                <ContractAddress>
                  {chain.deploymentStatus === 'failed' 
                    ? (chain.deploymentError || 'Deployment failed') 
                    : (chain.contractAddress || 'Address not available')}
                </ContractAddress>
              </ChainInfo>
              <StatusSection>
                <VerificationBadge className={deploymentStatusClass}>
                  <IconWrapper>
                    {chain.deploymentStatus === 'failed' 
                      ? <XCircleIcon style={{ width: '14px', height: '14px' }} />
                      : <VerificationIcon style={{ width: '14px', height: '14px' }} />}
                  </IconWrapper>
                  {chain.deploymentStatus === 'failed' 
                    ? 'Deployment Failed' 
                    : verificationStatusText}
                </VerificationBadge>
                {explorerUrl && chain.deploymentStatus !== 'failed' && (
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
           {allSuccessful ? 'Launch Another Token' : 'Try Again'}
         </ActionButton>
      )}
    </ConfirmationContainer>
  );
};

export default DeploymentConfirmation; 