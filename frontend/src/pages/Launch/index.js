import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAccount, useBalance, useSendTransaction, useChainId, usePublicClient, useWalletClient } from 'wagmi';
import { parseEther, formatEther } from 'ethers';

// Components
import FormInput from '../../components/FormInput';
import ChainSelector from '../../components/ChainSelector';
import FileUpload from '../../components/FileUpload';
import ImageUpload from '../../components/ImageUpload';
import DistributionInput from '../../components/DistributionInput';
import DistributionList from '../../components/DistributionList';
import DeploymentConfirmation from '../../components/DeploymentConfirmation';

// Utils
import { switchToZetaChain } from '../../utils/networkSwitchingUtility';
import { parseDistributionCSV } from '../../utils/csvParser';
import apiService from '../../services/apiService';

// Constants
const ZETA_FEE = 1; // 1 ZETA fee
const ZETACHAIN_ID = 7001; // Athens Testnet
const UNIVERSAL_TOKEN_SERVICE_WALLET = '0x04dA1034E7d84c004092671bBcEb6B1c8DCda7AE'; // Actual wallet address

// Add Deployment Status constants
const DEPLOYMENT_STATUS = {
  IDLE: 'idle',                   // Initial state, form visible
  CREATING: 'creating',           // Calling createToken API
  PAYING: 'paying',               // Waiting for fee payment transaction
  INITIATED: 'initiated',         // deployToken API called, waiting for backend processing
  POLLING: 'polling',             // Actively polling for backend completion
  COMPLETED: 'completed',         // Backend confirmed deployment success
  FAILED_PAYMENT: 'failed_payment', // Fee payment failed
  FAILED_DEPLOYMENT: 'failed_deployment', // Backend indicated deployment failure
};

const PageContainer = styled.div`
  max-width: ${props => props.embedded ? '100%' : '800px'};
  margin: 0 auto;
  padding: ${props => props.embedded ? '0' : '40px 20px'};
`;

const PageTitle = styled.h1`
  margin-bottom: 32px;
  text-align: center;
  display: ${props => props.embedded ? 'none' : 'block'};
`;

const FormContainer = styled.div`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 32px;
`;

const SectionTitle = styled.h2`
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 16px;
`;

const FormRow = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const FormGroup = styled.div`
  flex: 1;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 32px;
`;

const SubmitButton = styled.button`
  background-color: var(--accent-primary);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 14px 32px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    opacity: 0.9;
  }
  
  &:disabled {
    background-color: #666;
    cursor: not-allowed;
    opacity: 0.7;
  }
`;

const FeeSection = styled.div`
  background-color: rgba(60, 157, 242, 0.1);
  border-radius: 8px;
  padding: 16px;
  margin-top: 24px;
`;

const FeeRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`;

const FeeName = styled.span`
  color: var(--text-secondary);
`;

const FeeAmount = styled.span`
  color: var(--text-primary);
  font-weight: 600;
`;

const ErrorMessage = styled.div`
  color: var(--error);
  padding: 12px;
  border-radius: 8px;
  background-color: rgba(255, 82, 82, 0.1);
  margin-top: 16px;
  text-align: center;
`;

const DistributionToggle = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
`;

const ToggleButton = styled.button`
  background: ${props => props.$active ? 'var(--accent-primary)' : 'transparent'};
  color: ${props => props.$active ? 'white' : 'var(--text-secondary)'};
  border: 1px solid ${props => props.$active ? 'var(--accent-primary)' : 'var(--border)'};
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: var(--accent-primary);
    color: ${props => props.$active ? 'white' : 'var(--accent-primary)'};
  }
`;

const LaunchPage = ({ embedded = false }) => {
  const { address, isConnected } = useAccount();
  const currentChainId = useChainId();
  const isZetaChainNetwork = currentChainId === ZETACHAIN_ID;
  const { data: balanceData } = useBalance({
    address,
    chainId: ZETACHAIN_ID
  });
  
  const { sendTransactionAsync } = useSendTransaction();
  const publicClient = usePublicClient({ chainId: ZETACHAIN_ID });
  const { data: walletClient } = useWalletClient({ chainId: ZETACHAIN_ID });
  
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    decimals: '18',
    totalSupply: '',
    selectedChains: ['7001'], // Initialize with ZetaChain Athens
  });
  
  const [distributionMethod, setDistributionMethod] = useState('manual'); // 'manual' or 'csv'
  const [tokenIcon, setTokenIcon] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [distributions, setDistributions] = useState([]);
  const [csvParseResult, setCsvParseResult] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [createdTokenId, setCreatedTokenId] = useState(null);
  const [transactionRetries, setTransactionRetries] = useState(0);
  const [showRetryButton, setShowRetryButton] = useState(false);
  const [transactionHash, setTransactionHash] = useState(null);
  const [deploymentStatus, setDeploymentStatus] = useState(DEPLOYMENT_STATUS.IDLE); // Add deployment status state
  const [deploymentLogs, setDeploymentLogs] = useState([]); // Add deployment logs state
  
  const resetForm = () => {
    setFormData({
      name: '',
      symbol: '',
      decimals: '18',
      totalSupply: '',
      selectedChains: ['7001'],
    });
    setTokenIcon(null);
    setCsvFile(null);
    setDistributions([]);
    setCsvParseResult(null);
    setCreatedTokenId(null);
    setTransactionHash(null);
    setDeploymentStatus(DEPLOYMENT_STATUS.IDLE);
    setDeploymentLogs([]);
    setErrors({});
    setProcessingStep('');
    setTransactionRetries(0);
    setShowRetryButton(false);
  };
  
  // Verify wallet is ready
  const [walletReady, setWalletReady] = useState(false);
  
  useEffect(() => {
    if (isConnected && isZetaChainNetwork && walletClient) {
      setWalletReady(true);
    } else {
      setWalletReady(false);
    }
  }, [isConnected, isZetaChainNetwork, walletClient]);
  
  const chainOptions = [
    { value: '7001', label: 'ZetaChain Athens' },
    { value: '11155111', label: 'Ethereum Sepolia' },
    { value: '97', label: 'BSC Testnet' },
    { value: '84532', label: 'Base Sepolia' },
    { value: 'solana', label: 'Solana', disabled: true, comingSoon: true },
    { value: 'sui', label: 'SUI', disabled: true, comingSoon: true },
    { value: 'ton', label: 'TON', disabled: true, comingSoon: true }
  ];
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle chain selection
    if (name === 'chains') {
      setFormData(prev => ({ ...prev, selectedChains: value }));
      return;
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear errors when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };
  
  const handleIconChange = (file) => {
    setTokenIcon(file);
    if (errors.icon) {
      setErrors({ ...errors, icon: null });
    }
  };
  
  const handleCsvChange = async (file) => {
    setCsvFile(file);
    
    if (errors.csv) {
      setErrors({ ...errors, csv: null });
    }
    
    // Parse and validate the CSV
    try {
      const result = await parseDistributionCSV(file);
      setCsvParseResult(result);
      
      if (result.isValid) {
        setDistributions(result.data);
      } else {
        setErrors({ 
          ...errors, 
          csv: `CSV contains ${result.errors.length} error(s). Please fix and re-upload.` 
        });
      }
    } catch (error) {
      console.error('Error parsing CSV:', error);
      setErrors({ ...errors, csv: 'Failed to parse CSV file. Please check the format.' });
    }
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    // Network validation
    if (!isZetaChainNetwork) {
      newErrors.network = 'Please switch to ZetaChain network';
    }
    
    // Balance validation
    if (balanceData && parseFloat(balanceData.formatted) < ZETA_FEE) {
      newErrors.balance = `Insufficient ZETA balance. You need at least ${ZETA_FEE} ZETA. Current balance: ${parseFloat(balanceData.formatted).toFixed(2)} ZETA`;
    }
    
    // Field validation
    if (!formData.name.trim()) {
      newErrors.name = 'Token name is required';
    }
    
    if (!formData.symbol.trim()) {
      newErrors.symbol = 'Token symbol is required';
    } else if (formData.symbol.length > 10) {
      newErrors.symbol = 'Symbol should be 10 characters or less';
    }
    
    if (!formData.totalSupply) {
      newErrors.totalSupply = 'Total supply is required';
    } else if (isNaN(formData.totalSupply) || parseFloat(formData.totalSupply) <= 0) {
      newErrors.totalSupply = 'Total supply must be a positive number';
    }
    
    if (!formData.decimals) {
      newErrors.decimals = 'Decimals is required';
    } else if (isNaN(formData.decimals) || parseInt(formData.decimals) < 0 || parseInt(formData.decimals) > 18) {
      newErrors.decimals = 'Decimals must be between 0 and 18';
    }

    if (!formData.selectedChains || formData.selectedChains.length === 0) {
      newErrors.chains = 'At least one chain must be selected';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setProcessingStep('Creating and deploying token...');
    setErrors({});
    setTransactionRetries(0);
    setShowRetryButton(false);
    setDeploymentStatus(DEPLOYMENT_STATUS.CREATING);
    
    try {
      const deploymentData = {
        tokenName: formData.name,
        tokenSymbol: formData.symbol,
        decimals: parseInt(formData.decimals, 10),
        totalSupply: formData.totalSupply,
        selectedChains: formData.selectedChains,
        deployerAddress: address // current wallet address
      };
      
      // Start fee payment process
      setDeploymentStatus(DEPLOYMENT_STATUS.PAYING);
      setProcessingStep('Processing fee payment transaction...');
      const feeInWei = parseEther(ZETA_FEE.toString());
      
      // Validate wallet and network
      if (!isConnected) {
        throw new Error('Wallet not connected. Please connect your wallet and try again.');
      }
      
      if (!isZetaChainNetwork) {
        throw new Error('Please switch to ZetaChain network before proceeding.');
      }
      
      if (!walletReady) {
        // Wait briefly for wallet to be ready
        setProcessingStep('Preparing wallet...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (!walletClient) {
          throw new Error('Wallet client not available. Please ensure your wallet is properly connected.');
        }
      }
      
      // Prepare transaction parameters
      const txParams = {
        to: UNIVERSAL_TOKEN_SERVICE_WALLET,
        value: feeInWei,
        chainId: ZETACHAIN_ID
      };
      
      setProcessingStep('Waiting for wallet signature...');
      
      // Send the transaction
      const txResult = await sendTransactionAsync(txParams);
      
      // Extract transaction hash
      let txHash;
      if (txResult && typeof txResult === 'object' && txResult.hash) {
        txHash = txResult.hash;
      } else if (typeof txResult === 'string' && txResult.startsWith('0x')) {
        txHash = txResult;
      } else {
        throw new Error('Wallet interaction failed unexpectedly. Invalid response received.');
      }
      
      // Set transaction hash for UI
      setTransactionHash(txHash);
      console.log('Fee payment transaction submitted:', txHash);
      
      // Wait for transaction confirmation
      setProcessingStep('Waiting for transaction confirmation...');
      
      let confirmed = false;
      let attempts = 0;
      const maxAttempts = 20;
      
      while (!confirmed && attempts < maxAttempts) {
        try {
          attempts++;
          
          const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
          
          if (receipt && receipt.status === 'success') {
            confirmed = true;
          } else {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        } catch (error) {
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1500));
          }
        }
      }
      
      if (!confirmed) {
        throw new Error('Transaction confirmation timed out. The transaction may still complete - please check your wallet or block explorer.');
      }
      
      // Add fee transaction to deployment data
      deploymentData.fee_paid_tx = txHash;
      
      // Deploy the token using the new unified API
      setProcessingStep('Deploying token contracts...');
      setDeploymentStatus(DEPLOYMENT_STATUS.INITIATED);
      
      const deploymentResult = await apiService.deployUniversalToken(deploymentData);
      console.log('Deployment initiated:', deploymentResult);
      
      // Set token ID from response
      setCreatedTokenId(deploymentResult.tokenId || deploymentResult.id);
      
      // Start polling for deployment status
      setDeploymentStatus(DEPLOYMENT_STATUS.POLLING);
      setProcessingStep('Monitoring deployment progress...');
      
    } catch (error) {
      console.error('Error:', error);
      setErrors({...errors, submission: `Token creation error: ${error.message}`});
      setIsSubmitting(false);
      setProcessingStep('');
      
      if (error.message.includes('rejected') || error.message.includes('denied')) {
        setDeploymentStatus(DEPLOYMENT_STATUS.IDLE);
        // User explicitly rejected, don't show retry button
        setShowRetryButton(false);
      } else {
        // For other errors (like payment/confirmation timeout), allow retry
        setDeploymentStatus(DEPLOYMENT_STATUS.FAILED_PAYMENT);
        setShowRetryButton(true); // Ensure retry button is shown
      }
    }
  };
  
  const handleSwitchNetwork = async () => {
    await switchToZetaChain();
  };
  
  // Polling logic for deployment status
  useEffect(() => {
    let intervalId;

    const pollStatus = async () => {
      try {
        console.log(`[Polling Effect] Checking token status for ID: ${createdTokenId}`);
        const tokenData = await apiService.getToken(createdTokenId);
        console.log('[Polling Effect] Token data:', tokenData);

        // Check deploymentStatus field from API response (camelCase)
        if (tokenData.deploymentStatus === 'completed') {
          console.log('[Polling Effect] Deployment completed! Using token data...');
          // Process chainInfo from token response instead of fetching separate logs
          const chainInfoLogs = tokenData.chainInfo || [];
          console.log('[Polling Effect] Chain info:', chainInfoLogs);
          
          setDeploymentLogs(chainInfoLogs);
          setDeploymentStatus(DEPLOYMENT_STATUS.COMPLETED);
          console.log('[Polling Effect] Status set to COMPLETED. Clearing interval.');
          clearInterval(intervalId); // Explicitly clear here
          intervalId = null; // Ensure intervalId is nullified
        } else if (tokenData.deploymentStatus === 'failed') {
          console.error('[Polling Effect] Deployment failed on backend.', tokenData);
          // Use chain info from token response instead of fetching separate logs
          const chainInfoLogs = tokenData.chainInfo || [];
          console.log('[Polling Effect] Chain info for failed deployment:', chainInfoLogs);
          
          setDeploymentLogs(chainInfoLogs);
          setErrors({ submission: `Deployment failed on backend. ${tokenData.deploymentError || 'Unknown error'}` });
          setDeploymentStatus(DEPLOYMENT_STATUS.FAILED_DEPLOYMENT);
          console.log('[Polling Effect] Status set to FAILED_DEPLOYMENT. Clearing interval.');
          clearInterval(intervalId); // Explicitly clear here
          intervalId = null; // Ensure intervalId is nullified
        } else {
          // Still pending or processing on backend
          console.log(`[Polling Effect] Status is ${tokenData.deploymentStatus}. Continuing poll. Setting step message.`);
          // Only set status to POLLING if it wasn't already, though this shouldn't harm
          // setDeploymentStatus(DEPLOYMENT_STATUS.POLLING);
          setProcessingStep('Backend is deploying contracts... Please wait.');
        }
      } catch (error) {
        console.error('[Polling Effect] Error during pollStatus API call:', error);
        // Keep polling unless it's a fatal error (e.g., 404 Not Found)
        if (error.response && error.response.status === 404) {
            console.error('[Polling Effect] Token ID not found during poll. Stopping.');
            setErrors({ submission: `Error polling status: Token ID ${createdTokenId} not found.` });
            setDeploymentStatus(DEPLOYMENT_STATUS.FAILED_DEPLOYMENT); // Treat as failure if token vanishes
            clearInterval(intervalId);
            intervalId = null;
        } else {
             console.warn('[Polling Effect] Non-fatal polling error. Will retry.');
             setProcessingStep('Polling deployment status... Encountered temporary network error. Retrying...');
        }
        // Optionally add a max retry count for polling
      }
    };

    // Only start polling if status is INITIATED or POLLING
    if (deploymentStatus === DEPLOYMENT_STATUS.INITIATED || deploymentStatus === DEPLOYMENT_STATUS.POLLING) {
      console.log(`[Polling Effect] Status is ${deploymentStatus}. Starting polling interval.`);
      // Start polling immediately when initiated, then continue every 5 seconds
      pollStatus(); // Initial check right away
      // Ensure no duplicate interval is set if effect re-runs
      if (!intervalId) {
         intervalId = setInterval(pollStatus, 5000); // Poll every 5 seconds
         console.log(`[Polling Effect] setInterval created with ID: ${intervalId}`);
      }
    } else {
       console.log(`[Polling Effect] Status is ${deploymentStatus}. Not starting or stopping poll interval.`);
    }

    // Cleanup function to clear interval when component unmounts or status changes *away* from polling states
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        console.log(`[Polling Effect Cleanup] Cleared interval ID: ${intervalId}`);
      }
    };
  // Removed 'errors' from dependency array. Polling errors are handled internally.
  }, [deploymentStatus, createdTokenId]);
  
  // Render loading state if wallet not connected
  if (!isConnected) {
    return (
      <PageContainer embedded={embedded.toString()}>
        <PageTitle embedded={embedded.toString()}>Launch Token</PageTitle>
        <FormContainer>
          <p>Please connect your wallet to continue.</p>
        </FormContainer>
      </PageContainer>
    );
  }
  
  // Render network switch prompt if not on ZetaChain
  if (!isZetaChainNetwork && deploymentStatus === DEPLOYMENT_STATUS.IDLE) {
     return (
      <PageContainer embedded={embedded.toString()}>
         <PageTitle embedded={embedded.toString()}>Launch Token</PageTitle>
         <FormContainer>
           <ErrorMessage>
             You need to be on ZetaChain network to launch a token.
             <ButtonContainer>
               <SubmitButton onClick={handleSwitchNetwork}>
                 Switch to ZetaChain
               </SubmitButton>
             </ButtonContainer>
           </ErrorMessage>
         </FormContainer>
      </PageContainer>
     );
  }

  // Render based on deployment status
  const renderContent = () => {
    switch (deploymentStatus) {
      case DEPLOYMENT_STATUS.CREATING:
      case DEPLOYMENT_STATUS.PAYING:
      case DEPLOYMENT_STATUS.INITIATED:
      case DEPLOYMENT_STATUS.POLLING:
        return (
          <FormContainer>
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ marginBottom: '16px' }}>
                <span className="spinner" style={{ 
                  display: 'inline-block', 
                  width: '30px', 
                  height: '30px', 
                  border: '3px solid rgba(0, 0, 0, 0.1)', 
                  borderRadius: '50%', 
                  borderTopColor: 'var(--accent-primary)', 
                  animation: 'spin 1s ease-in-out infinite' 
                }}></span>
              </div>
              <p style={{ fontWeight: '600', marginBottom: '8px' }}>{processingStep || 'Processing...'}</p>
              {createdTokenId && (
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)'}}>Token ID: {createdTokenId}</p>
              )}

              {transactionHash && (
                <div style={{ margin: '15px 0', padding: '10px', backgroundColor: 'rgba(60, 157, 242, 0.1)', borderRadius: '8px' }}>
                  <p style={{ marginBottom: '5px', fontWeight: 'bold', fontSize: '14px' }}>Fee Transaction Hash:</p>
                  <p style={{ wordBreak: 'break-all', fontSize: '12px', fontFamily: 'monospace' }}>{transactionHash}</p>
                  <p style={{ marginTop: '10px' }}>
                    <a 
                      href={`https://explorer.zetachain.com/tx/${transactionHash}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ 
                        color: 'var(--accent-primary)', 
                        textDecoration: 'none',
                        padding: '5px 10px',
                        border: '1px solid var(--accent-primary)',
                        borderRadius: '5px',
                        fontSize: '14px',
                        display: 'inline-block',
                        marginTop: '5px'
                      }}
                    >
                      View on Explorer
                    </a>
                  </p>
                </div>
              )}

              {errors.submission && (
                <ErrorMessage style={{ marginTop: '20px' }}>
                  {errors.submission}
                </ErrorMessage>
              )}
            </div>
          </FormContainer>
        );

      case DEPLOYMENT_STATUS.FAILED_PAYMENT:
      case DEPLOYMENT_STATUS.FAILED_DEPLOYMENT:
         return (
           <FormContainer>
             <div style={{ textAlign: 'center', padding: '20px' }}>
               <ErrorMessage>
                 {errors.submission || 'An unexpected error occurred during deployment.'}
               </ErrorMessage>
               {createdTokenId && (
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '10px' }}>Token ID: {createdTokenId}</p>
               )}
               {showRetryButton && deploymentStatus === DEPLOYMENT_STATUS.FAILED_PAYMENT && (
                 <div style={{ marginTop: '20px' }}>
                   <p>Fee payment failed. Would you like to try again?</p>
                   <ButtonContainer>
                     <SubmitButton onClick={handleSubmit}>
                       Try Again
                     </SubmitButton>
                   </ButtonContainer>
                 </div>
               )}
                <ButtonContainer>
                 <SubmitButton onClick={resetForm} style={{backgroundColor: 'var(--secondary-button-bg)', color: 'var(--text-primary)'}}>
                   Start Over
                 </SubmitButton>
                </ButtonContainer>
             </div>
           </FormContainer>
         );

      case DEPLOYMENT_STATUS.COMPLETED:
        return (
          <DeploymentConfirmation
            logs={deploymentLogs}
            tokenId={createdTokenId}
            onStartNewDeployment={resetForm}
          />
        );

      case DEPLOYMENT_STATUS.IDLE:
      default:
        const isSubmitting = deploymentStatus !== DEPLOYMENT_STATUS.IDLE; // Simplified check
        return (
          <form onSubmit={handleSubmit}>
            <FormContainer>
              <SectionTitle>Token Information</SectionTitle>
              
              <FormRow>
                <FormGroup>
                  <FormInput
                    label="Token Name"
                    id="name"
                    name="name"
                    placeholder="e.g. Universal Token"
                    value={formData.name}
                    onChange={handleChange}
                    error={errors.name}
                  />
                </FormGroup>
                
                <FormGroup>
                  <FormInput
                    label="Token Symbol"
                    id="symbol"
                    name="symbol"
                    placeholder="e.g. UTK"
                    value={formData.symbol}
                    onChange={handleChange}
                    error={errors.symbol}
                  />
                </FormGroup>
              </FormRow>
              
              <FormRow>
                <FormGroup>
                  <FormInput
                    label="Decimals"
                    id="decimals"
                    name="decimals"
                    type="number"
                    placeholder="18"
                    value={formData.decimals}
                    onChange={handleChange}
                    error={errors.decimals}
                    min="0"
                    max="18"
                  />
                </FormGroup>
                
                <FormGroup>
                  <FormInput
                    label="Total Supply"
                    id="totalSupply"
                    name="totalSupply"
                    type="number"
                    placeholder="1000000"
                    value={formData.totalSupply}
                    onChange={handleChange}
                    error={errors.totalSupply}
                    min="1"
                  />
                </FormGroup>
              </FormRow>
              
              <FormRow>
                <FormGroup>
                  <ChainSelector
                    label="Target Chains"
                    options={chainOptions}
                    value={formData.selectedChains}
                    onChange={handleChange}
                    helperText="Select chains for deployment. ZetaChain is required."
                    error={errors.chains}
                  />
                </FormGroup>
              </FormRow>
              
              <FormRow>
                <FormGroup>
                  <ImageUpload
                    label="Token Icon (Optional)"
                    id="tokenIcon"
                    onChange={handleIconChange}
                    onRemove={() => setTokenIcon(null)}
                    helperText="Recommended size: 512x512px, PNG or JPG"
                    error={errors.icon}
                  />
                </FormGroup>
              </FormRow>
            </FormContainer>
            
            <FormContainer>
              <SectionTitle>Initial Distribution (Optional)</SectionTitle>
              
              <DistributionToggle>
                <ToggleButton
                  type="button"
                  $active={distributionMethod === 'manual'}
                  onClick={() => {
                    setDistributionMethod('manual');
                    setCsvFile(null);
                    setCsvParseResult(null);
                  }}
                >
                  Manual Entry
                </ToggleButton>
                <ToggleButton
                  type="button"
                  $active={distributionMethod === 'csv'}
                  onClick={() => {
                    setDistributionMethod('csv');
                    setDistributions([]);
                  }}
                >
                  Upload CSV
                </ToggleButton>
              </DistributionToggle>

              <FormRow>
                <FormGroup>
                  {distributionMethod === 'manual' ? (
                    <DistributionInput
                      onDistributionsChange={setDistributions}
                      chainId={currentChainId.toString()} // Pass current chain for context
                      error={errors.distributions}
                      helperText="Enter wallet addresses (one per line) and the amount"
                    />
                  ) : (
                    <FileUpload
                      label="CSV Distribution List"
                      id="csvFile"
                      accept=".csv"
                      onChange={handleCsvChange}
                      onRemove={() => {
                        setCsvFile(null);
                        setDistributions([]);
                        setCsvParseResult(null);
                      }}
                      helperText={
                        csvParseResult 
                          ? `${csvParseResult.validEntries} valid entries of ${csvParseResult.totalEntries} total` 
                          : "CSV format: address,amount (max 100 entries)"
                      }
                      error={errors.csv}
                    />
                  )}
                </FormGroup>
              </FormRow>

              {distributions.length > 0 && (
                <FormRow>
                  <FormGroup>
                    <DistributionList distributions={distributions} />
                  </FormGroup>
                </FormRow>
              )}
            </FormContainer>
            
            <FormContainer>
              <SectionTitle>Fee Information</SectionTitle>
              <FeeSection>
                <FeeRow>
                  <FeeName>Deployment Fee</FeeName>
                  <FeeAmount>{ZETA_FEE} ZETA</FeeAmount>
                </FeeRow>
                <FeeRow>
                  <FeeName>Your ZETA Balance</FeeName>
                  <FeeAmount>
                    {balanceData 
                      ? `${parseFloat(balanceData.formatted).toFixed(2)} ZETA` 
                      : 'Loading...'}
                  </FeeAmount>
                </FeeRow>
                {errors.balance && <ErrorMessage>{errors.balance}</ErrorMessage>}
              </FeeSection>
              
              {errors.submission && (
                <ErrorMessage>{errors.submission}</ErrorMessage>
              )}
              
              <ButtonContainer>
                <SubmitButton 
                  type="submit" 
                  disabled={isSubmitting || !isZetaChainNetwork}
                >
                  {isSubmitting ? 'Processing...' : 'Launch Token'}
                </SubmitButton>
              </ButtonContainer>
            </FormContainer>
          </form>
        );
    }
  };
  
  return (
    <PageContainer embedded={embedded.toString()}>
      <PageTitle embedded={embedded.toString()}>Launch Token</PageTitle>
      
      {renderContent()}

      <style jsx="true">{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </PageContainer>
  );
};

export default LaunchPage; 