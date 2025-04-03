import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAccount, useBalance, useSendTransaction, useChainId, usePublicClient, useWalletClient } from 'wagmi';
import { parseEther } from 'viem';

// Components
import FormInput from '../../components/FormInput';
import ChainSelector from '../../components/ChainSelector';
import FileUpload from '../../components/FileUpload';
import ImageUpload from '../../components/ImageUpload';
import DistributionInput from '../../components/DistributionInput';
import DistributionList from '../../components/DistributionList';
import DeploymentConfirmation from '../../components/DeploymentConfirmation';
import Button from '../../components/Button'; // Import the new Button component

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

const EnhancedCreatePanel = styled.div`
  background-color: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  margin: 24px auto;
  max-width: 800px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  transition: transform 0.2s ease;
  
  &:hover {
    transform: scale(1.01);
  }
`;

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
  transition: color 0.2s ease-in-out, border-color 0.2s ease-in-out, background-color 0.2s ease-in-out;
  position: relative; /* Optional: for future pseudo-elements */

  &:hover {
    border-color: var(--accent-primary);
    color: ${props => props.$active ? 'white' : 'var(--accent-primary)'};
    background-color: ${props => !props.$active && 'rgba(60, 157, 242, 0.1)'}; /* Subtle background on hover if not active */
  }

  &:active {
    transform: scale(0.98);
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
    
    // Validate form before submission
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setIsSubmitting(true);
    setDeploymentStatus(DEPLOYMENT_STATUS.CREATING);
    setProcessingStep('Preparing token configuration...');
    setErrors({});
    setTransactionRetries(0);
    setShowRetryButton(false);
    setPollingCount(0);
    
    try {
      // Format data according to the API requirements (snake_case properties)
      const tokenData = {
        token_name: formData.name.trim(),
        token_symbol: formData.symbol.trim(),
        decimals: parseInt(formData.decimals, 10),
        total_supply: formData.totalSupply.toString(), // Must be a string for large numbers
        selected_chains: formData.selectedChains.map(id => id.toString()), // Must be strings
        deployer_address: address
      };
      
      // Handle token allocations
      if (distributions.length > 0) {
        tokenData.allocations = distributions.map(dist => ({
          address: dist.address,
          amount: dist.amount.toString() // Must be a string
        }));
      } else {
        // Default allocation - all tokens to deployer
        tokenData.allocations = [{
          address: address,
          amount: formData.totalSupply.toString()
        }];
      }
      
      console.log('Submitting token data:', tokenData);
      
      // Call the API to create and deploy the token
      const response = await apiService.deployUniversalToken(tokenData);
      console.log('Token creation response:', response);
      
      if (!response.deployment_id && !response.success) {
        throw new Error('Failed to create token configuration');
      }
      
      // Store the token ID for polling
      const deploymentId = response.deployment_id || response.token?.id;
      if (!deploymentId) {
        throw new Error('No deployment ID returned from API');
      }
      
      setCreatedTokenId(deploymentId);
      console.log(`Token configuration created with ID: ${deploymentId}`);
      
      // Process fee payment
      setDeploymentStatus(DEPLOYMENT_STATUS.PAYING);
      setProcessingStep('Preparing fee payment transaction...');
      
      // Prepare transaction parameters
      const txParams = {
        to: UNIVERSAL_TOKEN_SERVICE_WALLET,
        value: parseEther('1'), // 1 ZETA fee
        chainId: 7001 // ZetaChain Athens
      };
      
      setProcessingStep('Waiting for wallet signature... Please check your wallet.');
      
      // Send the transaction
      const tx = await sendTransactionAsync(txParams);
      
      // Ensure we have a valid transaction hash
      if (!tx || !tx.hash) {
        throw new Error('Transaction failed or no hash returned');
      }
      
      const txHash = tx.hash;
      setTransactionHash(txHash);
      setProcessingStep(`Fee payment transaction sent! Hash: ${txHash}`);
      
      // Wait for transaction confirmation with retries
      setProcessingStep('Waiting for transaction confirmation on ZetaChain...');
      
      try {
        // Use our custom confirmTransaction function which has retry logic
        await confirmTransaction(txHash);
        
        setProcessingStep('Payment confirmed! Initiating backend deployment...');
        
        // Pass the full token data again for the second API call
        await apiService.deployToken(deploymentId, {
          fee_paid_tx: txHash,
          token_name: tokenData.token_name,
          token_symbol: tokenData.token_symbol,
          deployer_address: tokenData.deployer_address,
          selected_chains: tokenData.selected_chains
        });
        
        // Start polling for deployment status
        setDeploymentStatus(DEPLOYMENT_STATUS.POLLING);
        setProcessingStep('Deployment initiated! Polling for status updates...');
      } catch (txError) {
        console.error('Transaction confirmation error:', txError);
        setErrors({ submission: `Transaction confirmation failed: ${txError.message}` });
        setDeploymentStatus(DEPLOYMENT_STATUS.FAILED_PAYMENT);
        throw txError; // Re-throw to stop processing
      }
      
    } catch (error) {
      console.error('Error during token creation:', error);
      
      // Check if this was a user rejection
      if (error.message.includes('rejected') || error.code === 'ACTION_REJECTED') {
        setErrors({ submission: 'Transaction was rejected in wallet.' });
        setDeploymentStatus(DEPLOYMENT_STATUS.FAILED_PAYMENT);
      } else if (error.name === 'TransactionReceiptNotFoundError' || 
                error.message.includes('receipt') || 
                error.message.includes('confirmation')) {
        // Handle transaction confirmation errors specially
        setErrors({ 
          submission: 'Transaction may still be processing. You can check the explorer link below or try again later.' 
        });
        setDeploymentStatus(DEPLOYMENT_STATUS.FAILED_PAYMENT);
        setShowRetryButton(true);
      } else if (error.response && error.response.data && error.response.data.detail) {
        // Extract validation errors from API response
        let errorMsg = 'Validation error: ';
        
        if (Array.isArray(error.response.data.detail)) {
          errorMsg += error.response.data.detail.map(err => 
            `${err.loc[err.loc.length-1]}: ${err.msg}`
          ).join(', ');
        } else {
          errorMsg += error.response.data.detail;
        }
        
        setErrors({ submission: errorMsg });
        setDeploymentStatus(DEPLOYMENT_STATUS.FAILED_DEPLOYMENT);
      } else {
        setErrors({ submission: `Error: ${error.message || 'Unknown error occurred'}` });
        
        // Determine which phase failed
        if (deploymentStatus === DEPLOYMENT_STATUS.CREATING) {
          setDeploymentStatus(DEPLOYMENT_STATUS.FAILED_DEPLOYMENT);
        } else if (deploymentStatus === DEPLOYMENT_STATUS.PAYING) {
          setDeploymentStatus(DEPLOYMENT_STATUS.FAILED_PAYMENT);
          // Show retry button for payment failures
          setShowRetryButton(true);
        } else {
          setDeploymentStatus(DEPLOYMENT_STATUS.FAILED_DEPLOYMENT);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Transaction confirmation function with retries
  const confirmTransaction = async (txHash) => {
    let confirmed = false;
    let attempts = 0;
    const maxAttempts = 20; // Increase max attempts
    
    while (!confirmed && attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`Attempting to get transaction receipt (Attempt ${attempts}/${maxAttempts})...`);
        
        // Update UI with progress
        setProcessingStep(`Waiting for transaction confirmation... (Attempt ${attempts}/${maxAttempts})`);
        
        // Add increasing delay between attempts
        const delayMs = Math.min(2000 + (attempts * 1000), 10000); // Start with 2s, increase by 1s each try, max 10s
        await new Promise(resolve => setTimeout(resolve, delayMs));
        
        // Try to get the transaction receipt
        let receipt = null;
        
        try {
          // Method 1: Direct getTransactionReceipt
          receipt = await publicClient.getTransactionReceipt({ hash: txHash });
          
          if (receipt && receipt.status === 'success') {
            console.log('Transaction confirmed successfully!', receipt);
            setProcessingStep('Transaction confirmed successfully!');
            return receipt; // Success!
          } else if (receipt && receipt.status === 'reverted') {
            setProcessingStep('Transaction was reverted on-chain');
            throw new Error('Transaction was reverted on-chain');
          } else if (receipt) {
            // If we get here, receipt exists but status is not success - wait and try again
            console.log(`Receipt found but status not success. Current status: ${receipt?.status || 'unknown'}`);
            setProcessingStep(`Transaction processing... Current status: ${receipt?.status || 'unknown'}`);
          }
        } catch (receiptError) {
          console.log('Error getting receipt directly:', receiptError.message);
          
          // Check if it's a "receipt not found" error, which is expected early on
          if (receiptError.name === 'TransactionReceiptNotFoundError' || receiptError.message.includes('could not be found')) {
            console.log(`Transaction receipt not found yet (attempt ${attempts}/${maxAttempts}). Waiting...`);
            setProcessingStep(`Transaction not yet mined on ZetaChain... (Attempt ${attempts}/${maxAttempts})`);
          } else {
            // For other errors, log but continue retrying
            console.error(`Error checking transaction (attempt ${attempts}/${maxAttempts}):`, receiptError.message);
            setProcessingStep(`Error checking transaction: ${receiptError.message} (Retrying...)`);
          }
          
          // Only throw on last attempt
          if (attempts >= maxAttempts) {
            setProcessingStep(`Failed to confirm transaction after ${maxAttempts} attempts`);
            throw new Error(`Failed to confirm transaction after ${maxAttempts} attempts: ${receiptError.message}`);
          }
        }
      } catch (error) {
        // Only throw on last attempt
        if (attempts >= maxAttempts) {
          setProcessingStep(`Failed to confirm transaction after ${maxAttempts} attempts`);
          throw new Error(`Failed to confirm transaction after ${maxAttempts} attempts: ${error.message}`);
        }
      }
    }
    
    // If we get here, we've run out of attempts
    setProcessingStep(`Transaction confirmation timed out after ${maxAttempts} attempts`);
    throw new Error(`Transaction confirmation timed out after ${maxAttempts} attempts`);
  };
  
  const handleSwitchNetwork = async () => {
    await switchToZetaChain();
  };
  
  const pollStatus = async () => {
    try {
      setPollingCount(prev => prev + 1);
      console.log(`[Polling Effect] Poll count: ${pollingCount + 1}`);
      
      // For demo purposes, make a real API call and handle errors properly
      try {
        const tokenData = await apiService.getToken(createdTokenId);
        console.log('[Polling Effect] Token data from initial poll:', tokenData);
        
        if (tokenData && tokenData.token) {
          const status = tokenData.token.deployment_status || tokenData.token.deploymentStatus;
          if (status === 'completed') {
            setDeploymentStatus(DEPLOYMENT_STATUS.COMPLETED);
          } else if (status === 'failed') {
            setDeploymentStatus(DEPLOYMENT_STATUS.FAILED_DEPLOYMENT);
            setErrors({ submission: tokenData.token.error_message || tokenData.token.deploymentError || 'Deployment failed' });
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
        
        // Get token data from API
        const tokenData = await apiService.getToken(createdTokenId);
        console.log('[Polling Effect] Token data:', tokenData);

        // Reset error state if we successfully get data
        if (errors.submission) {
          setErrors(prev => ({...prev, submission: null}));
        }

        // Extract token object from response
        const token = tokenData.token || tokenData;
        
        if (!token) {
          console.warn('[Polling Effect] No token data in response');
          if (attempts >= MAX_ATTEMPTS) {
            setErrors({ submission: 'No token data received after maximum attempts' });
            setDeploymentStatus(DEPLOYMENT_STATUS.FAILED_DEPLOYMENT);
            clearInterval(intervalId);
            intervalId = null;
          }
          return;
        }
        
        // Get deployment status - check both snake_case and camelCase versions
        const status = token.deployment_status || token.deploymentStatus;
        console.log(`[Polling Effect] Deployment status: ${status}`);
        
        if (status === 'completed') {
          console.log('[Polling Effect] Deployment completed!');
          
          // Extract chain info from the appropriate source
          let chainInfoLogs = [];
          
          if (token.chainInfo && Array.isArray(token.chainInfo)) {
            // Use the processed chainInfo if available
            chainInfoLogs = token.chainInfo;
          } else if (token.connected_chains_json) {
            // Extract from connected_chains_json if available
            chainInfoLogs = Object.values(token.connected_chains_json);
          } else if (token.zeta_chain_info) {
            // At minimum, include ZetaChain info if available
            chainInfoLogs = [token.zeta_chain_info];
          }
          
          console.log('[Polling Effect] Chain info:', chainInfoLogs);
          
          setDeploymentLogs(chainInfoLogs);
          setDeploymentStatus(DEPLOYMENT_STATUS.COMPLETED);
          console.log('[Polling Effect] Status set to COMPLETED. Clearing interval.');
          clearInterval(intervalId);
          intervalId = null;
        } else if (status === 'failed') {
          console.error('[Polling Effect] Deployment failed on backend.', token);
          
          // Extract chain info for failed deployment
          let chainInfoLogs = [];
          
          if (token.chainInfo && Array.isArray(token.chainInfo)) {
            chainInfoLogs = token.chainInfo;
          } else if (token.connected_chains_json) {
            chainInfoLogs = Object.values(token.connected_chains_json);
          }
          
          console.log('[Polling Effect] Chain info for failed deployment:', chainInfoLogs);
          
          // Get error message (check various possible field names)
          const errorMessage = token.error_message || token.deploymentError || 'Unknown error';
          
          setDeploymentLogs(chainInfoLogs);
          setErrors({ submission: `Deployment failed on backend. ${errorMessage}` });
          setDeploymentStatus(DEPLOYMENT_STATUS.FAILED_DEPLOYMENT);
          clearInterval(intervalId);
          intervalId = null;
        } else {
          // Still pending or processing on backend
          console.log(`[Polling Effect] Status is ${status}. Continuing poll.`);
          setProcessingStep('Backend is deploying contracts... Please wait.');
        }
      } catch (error) {
        console.error('[Polling Effect] Error during pollStatus API call:', error);
        
        // Handle API errors
        if (error.response) {
          console.log('[Polling Effect] Error response:', error.response.status, error.response.data);
          
          if (error.response.status === 404) {
            console.error(`[Polling Effect] Token ID not found (404). Attempt ${attempts}/${MAX_ATTEMPTS}`);
            
            // Only fail after reaching max attempts
            if (attempts >= MAX_ATTEMPTS) {
              setErrors({ submission: `Unable to find token deployment after ${MAX_ATTEMPTS} attempts.` });
              setDeploymentStatus(DEPLOYMENT_STATUS.FAILED_DEPLOYMENT);
              clearInterval(intervalId);
              intervalId = null;
            } else {
              // Continue polling, might be pending indexing
              setProcessingStep(`Waiting for token to appear on server... (Attempt ${attempts}/${MAX_ATTEMPTS})`);
            }
          } else if (error.response.status >= 500) {
            // Server error, might be temporary
            setProcessingStep('Server error during polling. Retrying...');
          } else {
            // Other API errors
            if (attempts >= MAX_ATTEMPTS) {
              // Format error message
              let errorMsg = 'Unknown API error';
              if (error.response.data) {
                if (error.response.data.detail) {
                  errorMsg = typeof error.response.data.detail === 'string' 
                    ? error.response.data.detail 
                    : JSON.stringify(error.response.data.detail);
                } else if (error.response.data.message) {
                  errorMsg = error.response.data.message;
                }
              }
              
              setErrors({ submission: `Deployment error: ${errorMsg}` });
              setDeploymentStatus(DEPLOYMENT_STATUS.FAILED_DEPLOYMENT);
              clearInterval(intervalId);
              intervalId = null;
            }
          }
        } else if (error.request) {
          // Network error
          setProcessingStep('Network error during polling. Retrying...');
        } else {
          // Other errors
          if (attempts >= MAX_ATTEMPTS) {
            setErrors({ submission: `Error: ${error.message}` });
            setDeploymentStatus(DEPLOYMENT_STATUS.FAILED_DEPLOYMENT);
            clearInterval(intervalId);
            intervalId = null;
          }
        }
      }
    };

    // Start polling
    if (deploymentStatus === DEPLOYMENT_STATUS.INITIATED || deploymentStatus === DEPLOYMENT_STATUS.POLLING) {
      console.log(`[Polling Effect] Starting polling for token ID: ${createdTokenId}`);
      
      // Initial check right away
      pollStatus();
      
      // Set up interval for subsequent checks
      if (!intervalId) {
         intervalId = setInterval(pollStatus, 5000); // Poll every 5 seconds
      }
    }

    // Cleanup function
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        console.log(`[Polling Effect] Cleared polling interval`);
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
               <Button variant="primary" onClick={handleSwitchNetwork}>
                 Switch to ZetaChain
               </Button>
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
              <SectionTitle>
                {deploymentStatus === DEPLOYMENT_STATUS.FAILED_PAYMENT ? 'Payment Failed' : 'Deployment Failed'}
              </SectionTitle>
              <ErrorMessage>
                {errors.submission || 'An unexpected error occurred.'}
              </ErrorMessage>
              {createdTokenId && (
                 <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '10px' }}>Token ID: {createdTokenId}</p>
              )}
              {transactionHash && deploymentStatus === DEPLOYMENT_STATUS.FAILED_PAYMENT && (
                 <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '10px', wordBreak: 'break-all' }}>
                   Failed Tx: <a href={`https://explorer.athens.zetachain.com/tx/${transactionHash}`} target="_blank" rel="noopener noreferrer">{transactionHash}</a>
                 </p>
              )}

              {/* Buttons */} 
              <ButtonContainer style={{ marginTop: '24px', gap: '16px' }}>
                {showRetryButton && deploymentStatus === DEPLOYMENT_STATUS.FAILED_PAYMENT && (
                  <Button 
                    variant="primary" 
                    type="button"
                    onClick={handleSubmit} 
                    disabled={isSubmitting || !walletReady}
                  >
                    {isSubmitting ? 'Retrying...' : 'Retry Payment'}
                  </Button>
                )}
                <Button 
                  variant="secondary" 
                  type="button"
                  onClick={resetForm} 
                  disabled={isSubmitting}
                 >
                   Start Over
                 </Button>
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
          <EnhancedCreatePanel>
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
                  {!isConnected ? (
                    <Button variant="primary" type="button" disabled>Connect Wallet First</Button>
                  ) : !isZetaChainNetwork ? (
                    <Button variant="secondary" type="button" onClick={handleSwitchNetwork}>Switch to ZetaChain</Button>
                  ) : (
                    <Button
                      variant="primary"
                      type="submit" 
                      disabled={isSubmitting || !walletReady}
                    >
                      {isSubmitting ? 'Processing...' : (walletReady ? 'Launch Universal Token' : 'Wallet Not Ready')}
                    </Button>
                  )}
                </ButtonContainer>
              </FormContainer>
            </form>
          </EnhancedCreatePanel>
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