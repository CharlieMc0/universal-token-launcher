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
  const [walletReady, setWalletReady] = useState(false);
  const [chainOptions, setChainOptions] = useState([
    { value: '7001', label: 'ZetaChain Athens', isZetaChain: true },
    { value: '84532', label: 'Base Sepolia', disabled: true, comingSoon: true },
    { value: '97', label: 'BSC Testnet', disabled: true, comingSoon: true },
    { value: '11155111', label: 'Ethereum Sepolia', disabled: true, comingSoon: true }
  ]);
  const [pollingCount, setPollingCount] = useState(0);
  
  // Add effect to fetch supported chains from API
  useEffect(() => {
    const fetchSupportedChains = async () => {
      try {
        const chains = await apiService.getSupportedChains();
        // Transform API response to match the component's expected format
        if (chains && chains.length > 0) {
          const formattedChains = chains
            .filter(chain => chain.testnet === true) // Only include testnet chains
            .map(chain => ({
              value: chain.id,
              label: chain.name,
              disabled: !chain.enabled, // Disabled if not enabled
              comingSoon: !chain.enabled, // Show "Coming Soon" badge for disabled chains
              isZetaChain: chain.isZetaChain || false
            }));
            
          // Sort the chains to put ZetaChain first
          const sortedChains = formattedChains.sort((a, b) => {
            // Always put ZetaChain at the top (will be first in the grid, upper left)
            if (a.value === '7001' || a.isZetaChain) return -1;
            if (b.value === '7001' || b.isZetaChain) return 1;
            
            // Then sort enabled chains before disabled chains
            if (a.disabled && !b.disabled) return 1;
            if (!a.disabled && b.disabled) return -1;
            
            // Then sort alphabetically by name
            return a.label.localeCompare(b.label);
          });
                    
          setChainOptions(sortedChains);
        } else {
          throw new Error('No chains returned from API');
        }
      } catch (error) {
        console.error('Error fetching supported chains:', error);
        
        // Show error message in the UI
        setErrors(prev => ({
          ...prev,
          chainOptions: 'Temporarily unavailable, please check back soon'
        }));
        
        // Fallback to default testnet chains if API fails
        setChainOptions([
          { value: '7001', label: 'ZetaChain Athens', isZetaChain: true },
          { value: '84532', label: 'Base Sepolia', disabled: true, comingSoon: true },
          { value: '97', label: 'BSC Testnet', disabled: true, comingSoon: true },
          { value: '11155111', label: 'Ethereum Sepolia', disabled: true, comingSoon: true }
        ]);
      }
    };

    fetchSupportedChains();
  }, []);

  // Check if wallet client is ready
  useEffect(() => {
    if (isConnected && isZetaChainNetwork && walletClient) {
      setWalletReady(true);
    } else {
      setWalletReady(false);
    }
  }, [isConnected, isZetaChainNetwork, walletClient]);
  
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
    setPollingCount(0);
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle chain selection
    if (name === 'selectedChains') {
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
    
    // Basic form validation
    if (!formData.name.trim()) {
      newErrors.name = 'Token name is required';
    }
    
    if (!formData.symbol.trim()) {
      newErrors.symbol = 'Token symbol is required';
    } else if (formData.symbol.length > 6) {
      newErrors.symbol = 'Token symbol should be 6 characters or less';
    }
    
    if (!formData.decimals) {
      newErrors.decimals = 'Decimals are required';
    } else if (isNaN(parseInt(formData.decimals, 10)) || parseInt(formData.decimals, 10) < 0 || parseInt(formData.decimals, 10) > 18) {
      newErrors.decimals = 'Decimals must be a number between 0 and 18';
    }
    
    if (!formData.totalSupply) {
      newErrors.totalSupply = 'Total supply is required';
    } else {
      // Ensure totalSupply is a valid number string
      try {
        if (isNaN(formData.totalSupply) || formData.totalSupply.trim() === '') {
          newErrors.totalSupply = 'Total supply must be a valid number';
        }
      } catch (error) {
        newErrors.totalSupply = 'Total supply must be a valid number';
      }
    }
    
    if (!formData.selectedChains || formData.selectedChains.length === 0) {
      newErrors.selectedChains = 'At least one chain must be selected';
    }
    
    // Validate wallet address format
    if (!address) {
      newErrors.address = 'Wallet must be connected';
    } else if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      newErrors.address = 'Invalid wallet address format';
    }
    
    // Validate each distribution if any
    if (distributions.length > 0) {
      const distributionErrors = [];
      distributions.forEach((dist, index) => {
        if (!dist.address || !dist.address.match(/^0x[a-fA-F0-9]{40}$/)) {
          distributionErrors.push(`Distribution #${index + 1} has an invalid address format`);
        }
        if (!dist.amount || isNaN(dist.amount) || parseFloat(dist.amount) <= 0) {
          distributionErrors.push(`Distribution #${index + 1} has an invalid amount`);
        }
      });
      
      if (distributionErrors.length > 0) {
        newErrors.distributions = distributionErrors;
      }
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
    setPollingCount(0);
    setDeploymentStatus(DEPLOYMENT_STATUS.CREATING);
    
    try {
      // Format the deployment data according to backend requirements
      const deploymentData = {
        tokenName: formData.name.trim(),
        tokenSymbol: formData.symbol.trim(),
        decimals: parseInt(formData.decimals, 10),
        totalSupply: formData.totalSupply.toString(), // Ensure string format
        selectedChains: formData.selectedChains.map(id => id.toString()), // Ensure string format
        deployerAddress: address // current wallet address
      };
      
      // Add distributions if present, ensuring proper format
      if (distributions.length > 0) {
        deploymentData.allocations = distributions.map(dist => ({
          address: dist.address,
          amount: dist.amount.toString() // Ensure string format
        }));
      }
      
      console.log("Preparing to submit deployment data:", JSON.stringify(deploymentData, null, 2));
      
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
      setCreatedTokenId(deploymentResult.deployment_id || deploymentResult.tokenId || deploymentResult.id);
      
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
  
  const pollStatus = async (deploymentId) => {
    try {
      setPollingCount(prev => prev + 1);
      console.log(`[Polling Effect] Poll count: ${pollingCount + 1}`);
      
      // For demo purposes, make a real API call and handle errors properly
      try {
        const tokenData = await apiService.getToken(deploymentId);
        console.log('[Polling Effect] Token data from initial poll:', tokenData);
        
        if (tokenData && tokenData.deploymentStatus) {
          if (tokenData.deploymentStatus === 'completed') {
            setDeploymentStatus(DEPLOYMENT_STATUS.COMPLETED);
          } else if (tokenData.deploymentStatus === 'failed') {
            setDeploymentStatus(DEPLOYMENT_STATUS.FAILED_DEPLOYMENT);
            setErrors({ submission: tokenData.deploymentError || 'Deployment failed' });
          }
        }
      } catch (error) {
        console.error('[Polling Effect] Error in initial poll:', error);
        // Don't set failure yet, let the polling effect handle it
      }
      
      // Add a small delay to avoid hammering the API
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.log('[Polling Effect] Error during pollStatus API call:', error);
      
      // Let the polling effect handle the error
      console.log('[Polling Effect] Error logged, polling effect will handle retries.');
    }
  };
  
  // Use effect for polling when in polling status
  useEffect(() => {
    // Only poll when in polling status
    if (deploymentStatus !== DEPLOYMENT_STATUS.POLLING) {
      console.log(`[Polling Effect] Status is ${deploymentStatus}. Not starting or stopping poll interval.`);
      return;
    }

    let intervalId;
    let attempts = 0;
    const MAX_ATTEMPTS = 20; // Increase maximum attempts - deployment might take time

    const pollStatus = async () => {
      attempts++;
      try {
        console.log(`[Polling Effect] Checking token status for ID: ${createdTokenId} (Attempt: ${attempts}/${MAX_ATTEMPTS})`);
        const tokenData = await apiService.getToken(createdTokenId);
        console.log('[Polling Effect] Token data:', tokenData);

        // Reset error state if we successfully get data
        if (errors.submission) {
          setErrors(prev => ({...prev, submission: null}));
        }

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
          setProcessingStep('Backend is deploying contracts... Please wait.');
        }
      } catch (error) {
        console.error('[Polling Effect] Error during pollStatus API call:', error);
        
        // Handle API errors properly, but don't immediately fail
        if (error.response) {
          // The request was made and the server responded with an error status
          if (error.response.status === 404) {
            console.error(`[Polling Effect] Token ID not found (404). Attempt ${attempts}/${MAX_ATTEMPTS}`);
            
            // Only fail after reaching max attempts
            if (attempts >= MAX_ATTEMPTS) {
              setErrors({ submission: `Unable to find token deployment after ${MAX_ATTEMPTS} attempts. The token may still be processing.` });
              setDeploymentStatus(DEPLOYMENT_STATUS.FAILED_DEPLOYMENT);
              clearInterval(intervalId);
              intervalId = null;
            } else {
              // Continue polling, the backend might just need more time to register the token
              setProcessingStep(`Waiting for token to appear on server... (Attempt ${attempts}/${MAX_ATTEMPTS})`);
            }
          } else if (error.response.status >= 500) {
            // Server error, might be temporary
            console.warn('[Polling Effect] Server error during poll. Will retry.');
            setProcessingStep('Server error during polling. Retrying...');
          } else {
            // Other API error
            console.error('[Polling Effect] API error during poll:', error.response.data);
            // Continue polling even on other errors - only fail if max attempts reached
            if (attempts >= MAX_ATTEMPTS) {
              setErrors({ submission: `Deployment error: ${error.response.data?.message || 'Unknown API error'}` });
              setDeploymentStatus(DEPLOYMENT_STATUS.FAILED_DEPLOYMENT);
              clearInterval(intervalId);
              intervalId = null;
            }
          }
        } else if (error.request) {
          // The request was made but no response was received (network error)
          console.warn('[Polling Effect] Network error during poll. Will retry.');
          setProcessingStep('Network error during polling. Retrying...');
        } else {
          // Something else happened while setting up the request
          console.error('[Polling Effect] Unexpected error during poll:', error.message);
          if (attempts >= MAX_ATTEMPTS) {
            setErrors({ submission: `Unexpected error: ${error.message}` });
            setDeploymentStatus(DEPLOYMENT_STATUS.FAILED_DEPLOYMENT);
            clearInterval(intervalId);
            intervalId = null;
          }
        }
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

    // Cleanup function to clear interval when component unmounts or status changes
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        console.log(`[Polling Effect Cleanup] Cleared interval ID: ${intervalId}`);
      }
    };
  }, [deploymentStatus, createdTokenId, errors.submission]);
  
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
                  {errors.chainOptions ? (
                    <div style={{
                      padding: '16px',
                      backgroundColor: 'rgba(255, 180, 0, 0.1)',
                      border: '1px solid #ffb400',
                      borderRadius: '8px',
                      textAlign: 'center',
                      marginBottom: '16px'
                    }}>
                      <p style={{margin: 0, fontWeight: '500'}}>{errors.chainOptions}</p>
                    </div>
                  ) : null}
                  <ChainSelector
                    label="Target Chains"
                    options={chainOptions}
                    value={formData.selectedChains}
                    onChange={handleChange}
                    helperText="Select chains for deployment. ZetaChain is required."
                    error={errors.selectedChains}
                    name="selectedChains"
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