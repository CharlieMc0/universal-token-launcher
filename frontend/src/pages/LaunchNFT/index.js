import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAccount, useBalance, useChainId, useSendTransaction, usePublicClient } from 'wagmi';
import { parseEther } from 'ethers';
import FormInput from '../../components/FormInput';
import ImageUpload from '../../components/ImageUpload';
import DistributionInput from '../../components/DistributionInput';
import ChainSelector from '../../components/ChainSelector';
import apiService from '../../services/apiService';
import { ethers } from 'ethers';

// Styled Components
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

const BackendNotice = styled.div`
  background-color: rgba(255, 193, 7, 0.1);
  border-left: 4px solid #ffc107;
  padding: 16px;
  margin-bottom: 24px;
  border-radius: 0 8px 8px 0;
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

const FullWidthFormGroup = styled(FormGroup)`
  width: 100%;
  margin-bottom: 16px;
`;

const FeeInfo = styled.div`
  background-color: rgba(60, 157, 242, 0.1);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
`;

const FeeTitle = styled.h3`
  font-size: 18px;
  margin-bottom: 12px;
`;

const FeeDetail = styled.p`
  margin-bottom: 8px;
  color: var(--text-secondary);
`;

const BalanceInfo = styled.p`
  margin-top: 12px;
  font-weight: 500;
  ${props => props.hasError ? 'color: var(--error);' : ''}
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 32px;
`;

const DeployButton = styled.button`
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

const ErrorMessage = styled.div`
  color: var(--error);
  padding: 12px;
  border-radius: 8px;
  background-color: rgba(255, 82, 82, 0.1);
  margin-top: 16px;
  text-align: center;
`;

// Constants
const ZETA_FEE = 1; // Fee in ZETA
const UNIVERSAL_TOKEN_SERVICE_WALLET = '0xa48c0fC87BF398d258A75391Bc5Fe6BC5f8F9b3B'; // Updated with actual service wallet

const LaunchNFTPage = ({ embedded = false }) => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: balanceData } = useBalance({
    address,
    chainId: 7001, // ZetaChain Athens testnet
  });
  const { sendTransaction } = useSendTransaction();
  const publicClient = usePublicClient();
  
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    baseUri: '',
    maxSupply: '',
  });
  
  const [errors, setErrors] = useState({});
  const [nftImage, setNftImage] = useState(null);
  const [selectedChains, setSelectedChains] = useState(['7001']); // Initialize with ZetaChain
  const [distributions, setDistributions] = useState([]);
  const [deploymentStatus, setDeploymentStatus] = useState(null);
  const [deploymentDetails, setDeploymentDetails] = useState(null);
  const [deploymentId, setDeploymentId] = useState(null);
  const [processingStep, setProcessingStep] = useState('');
  const [txHash, setTxHash] = useState('');
  const [pollingInterval, setPollingInterval] = useState(null);
  
  const [chainOptions, setChainOptions] = useState([
    { value: '7001', label: 'ZetaChain Athens', isZetaChain: true }
  ]);
  
  const [chainsLoading, setChainsLoading] = useState(false);
  const [chainsError, setChainsError] = useState(null);
  
  const isZetaChainNetwork = chainId === 7001; // ZetaChain Athens testnet
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleImageUpload = (imageFile) => {
    console.log('Image uploaded:', imageFile ? 'Image file received' : 'No image file');
    setNftImage(imageFile);
    
    // Clear the image error if it exists
    if (errors.image) {
      setErrors(prev => ({ ...prev, image: null }));
    }
  };
  
  const handleChainSelection = (e) => {
    const value = e.target.value;
    console.log('Chain selection changed:', value);
    console.log('Event object:', e);
    console.log('Selection event target:', e.target);
    
    // Make sure we're getting an array of chain IDs
    if (Array.isArray(value)) {
      setSelectedChains(value);
    } else {
      console.error('Expected an array for chain selection, but got:', typeof value, value);
      // Try to handle string values
      if (typeof value === 'string') {
        try {
          // See if it's a JSON string
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            setSelectedChains(parsed);
          } else {
            setSelectedChains([value]); // Use as single value
          }
        } catch (e) {
          // Not JSON, use as single value
          setSelectedChains([value]);
        }
      }
    }
    
    // Clear any chain selection errors
    if (errors.chains) {
      setErrors({...errors, chains: null});
    }
  };
  
  const handleDistributionsChange = (newDistributions) => {
    setDistributions(newDistributions);
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    console.log('Validating form with data:', formData);
    console.log('Selected chains:', selectedChains);
    console.log('Image state:', nftImage);
    
    // Network validation
    if (!isZetaChainNetwork) {
      newErrors.network = 'Please switch to ZetaChain network';
      console.log('Validation failed: Not on ZetaChain network');
    }

    // Balance validation
    if (balanceData && parseFloat(balanceData.formatted) < ZETA_FEE) {
      newErrors.balance = `Insufficient ZETA balance. You need at least ${ZETA_FEE} ZETA. Current balance: ${parseFloat(balanceData.formatted).toFixed(2)} ZETA`;
      console.log('Validation failed: Insufficient balance');
    }
    
    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Collection name is required';
      console.log('Validation failed: Missing collection name');
    }
    
    // Symbol validation
    if (!formData.symbol.trim()) {
      newErrors.symbol = 'Symbol is required';
      console.log('Validation failed: Missing symbol');
    }
    
    // Base URI validation
    if (!formData.baseUri.trim()) {
      newErrors.baseUri = 'Base URI is required';
      console.log('Validation failed: Missing base URI');
    }
    
    // Max Supply validation
    if (!formData.maxSupply || parseInt(formData.maxSupply) <= 0) {
      newErrors.maxSupply = 'Max Supply must be a positive number';
      console.log('Validation failed: Invalid max supply');
    }
    
    // Image validation - making it optional since it's not actually sent to backend
    // The frontend shows an image uploader, but the API call doesn't include the image data
    // So we'll log a warning but allow the form to proceed
    if (!nftImage) {
      console.log('Warning: No image file detected in state, but proceeding with form submission');
      // Uncomment the following line if you want to enforce image upload again
      // newErrors.image = 'Please upload an image for your NFT collection';
    }
    
    // Selected chains validation
    if (selectedChains.length === 0) {
      newErrors.chains = 'Please select at least one chain';
      console.log('Validation failed: No chains selected');
    }
    
    setErrors(newErrors);
    console.log('Validation errors:', newErrors);
    console.log('Validation passed:', Object.keys(newErrors).length === 0);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Submit button clicked');
    
    // Reset previous errors/status
    setErrors({});
    setDeploymentStatus(null);
    setProcessingStep('');
    setDeploymentDetails(null);
    setTxHash('');
    if (pollingInterval) clearInterval(pollingInterval);
    setPollingInterval(null);

    if (!validateForm()) {
      console.log('Form validation failed');
      // Ensure errors are displayed
      // The validateForm function already sets errors state, so just return.
      return;
    }
    
    console.log('Form validation passed, proceeding with deployment');
    
    try {
      setDeploymentStatus('creating'); // Use 'creating' or 'initiating'
      setProcessingStep('Initiating NFT collection deployment with backend...');
      
      // Get the correctly checksummed address using ethers
      let checksummedAddress;
      try {
        checksummedAddress = ethers.getAddress(address);
        console.log('Using checksummed address:', checksummedAddress);
      } catch (addrError) {
         console.error("Error checksumming address:", addrError);
         throw new Error("Invalid deployer wallet address provided.");
      }

      // Prepare data for the backend API
      const apiData = {
        collection_name: formData.name,
        collection_symbol: formData.symbol,
        base_uri: formData.baseUri,
        max_supply: parseInt(formData.maxSupply, 10), // Ensure it's an integer
        selected_chains: selectedChains.map(chain => chain.toString()), // Ensure chain IDs are strings
        deployer_address: checksummedAddress // Use the correctly checksummed address
      };

      // Validate max_supply again after parseInt
      if (isNaN(apiData.max_supply) || apiData.max_supply <= 0) {
         throw new Error("Max supply must be a positive number.");
      }
      
      console.log('Sending NFT collection data to API:', apiData);
      
      // Step 1: Call the backend to initiate deployment
      const createResponse = await apiService.deployNFTCollection(apiData);
      console.log('NFT collection creation response:', createResponse);
      
      if (!createResponse || !createResponse.success) {
        const errorMsg = createResponse?.message || 
                        (createResponse?.errors && createResponse.errors.length > 0 ? createResponse.errors.join('; ') : 'Failed to initiate deployment. Check backend logs.');
        
        // Handle specific backend errors if needed
        if (errorMsg.includes("Deployment failed") && createResponse?.errors?.includes("Unknown error")) {
          throw new Error(`Backend error: The NFT deployment service is experiencing issues. Please check the backend logs.`);
        }
        
        // Set form-level errors if validation related
        if (createResponse?.errors) {
           const apiErrors = {};
           createResponse.errors.forEach(err => {
              // Basic parsing assuming "field: message" format or just message
              const parts = err.split(': ');
              if (parts.length === 2) {
                 apiErrors[parts[0]] = parts[1];
              } else {
                 // Assign general error if field isn't clear
                 apiErrors.general = (apiErrors.general ? apiErrors.general + '; ' : '') + err;
              }
           });
           setErrors(prev => ({ ...prev, ...apiErrors }));
        }

        throw new Error(`Failed to start NFT deployment: ${errorMsg}`);
      }
      
      // Store deployment ID for polling
      const newDeploymentId = createResponse.deployment_id;
      if (!newDeploymentId) {
        throw new Error('No deployment ID received from the server after initiation.');
      }
      
      setDeploymentId(newDeploymentId);
      setDeploymentStatus('deploying'); // Set status to deploying
      setProcessingStep(`Deployment initiated (ID: ${newDeploymentId}). Waiting for backend completion...`);
      
      // Step 2: Start polling for deployment status
      const intervalId = setInterval(async () => {
        try {
          console.log(`Polling deployment status for ID: ${newDeploymentId}...`);
          const collectionData = await apiService.getNFTCollection(newDeploymentId);
          
          if (collectionData && collectionData.collection) {
            const status = collectionData.collection.deployment_status || collectionData.collection.deploymentStatus; // Check both cases
            const errorMsg = collectionData.collection.error_message;

            console.log(`Polling result - Status: ${status}, Error: ${errorMsg}`);
            
            if (status === 'completed') {
              clearInterval(intervalId);
              setPollingInterval(null); // Clear interval state
              setDeploymentStatus('completed');
              setDeploymentDetails(collectionData.collection); // Store details for confirmation display
              setProcessingStep('Deployment completed successfully!');
              console.log('Deployment completed:', collectionData.collection);
            } else if (status === 'failed') {
              clearInterval(intervalId);
              setPollingInterval(null); // Clear interval state
              setDeploymentStatus('failed');
              const finalErrorMsg = `Deployment failed: ${errorMsg || 'Unknown error from backend.'}`;
              setProcessingStep(finalErrorMsg);
              setErrors(prev => ({ ...prev, general: finalErrorMsg })); // Display error
              console.error('Deployment failed:', collectionData.collection);
            } else {
              // Still processing
              setProcessingStep(`Deployment in progress... Status: ${status || 'pending'}`);
            }
          } else {
             console.warn(`Polling for ID ${newDeploymentId}: Received unexpected data format or no collection data.`);
             // Optionally add a counter to stop polling after too many empty responses
          }
        } catch (pollError) {
          console.error(`Error polling deployment status for ID ${newDeploymentId}:`, pollError);
          // Decide if polling should stop or continue after an error
          // Maybe stop after several consecutive errors?
          // clearInterval(intervalId);
          // setPollingInterval(null);
          // setDeploymentStatus('error');
          // setProcessingStep(`Error checking deployment status: ${pollError.message}`);
        }
      }, 5000); // Poll every 5 seconds
      
      setPollingInterval(intervalId); // Store interval ID to clear later if needed
      
    } catch (error) {
      console.error('NFT Deployment handleSubmit error:', error);
      setDeploymentStatus('error');
      const displayError = error.message || 'An unexpected error occurred during deployment.';
      setProcessingStep(`Error: ${displayError}`);
      // Set general form error
      setErrors(prev => ({ ...prev, general: displayError }));
    }
  };
  
  // Add effect to fetch supported chains from API
  useEffect(() => {
    const fetchSupportedChains = async () => {
      try {
        console.log('Fetching supported chains from API...');
        setChainsLoading(true);
        setChainsError(null); // Reset error state on new fetch
        
        const chains = await apiService.getSupportedChains();
        console.log('API returned raw chains:', chains);
        
        // Ensure API returned an array before proceeding
        if (!Array.isArray(chains)) {
          throw new Error('Invalid data format received from API (expected array).');
        }

        // Transform API response, filter for testnets
        const formattedChains = chains
          .filter(chain => chain && (chain.is_testnet === true || chain.testnet === true)) // Filter for testnet chains
          .map(chain => ({
            value: chain.chain_id || chain.id,
            label: chain.name || 'Unknown Chain',
            disabled: chain.enabled === false, // Explicitly check for false
            comingSoon: chain.enabled === false,
            isZetaChain: chain.chain_id === '7001' || chain.id === '7001' || chain.name?.toLowerCase().includes('zetachain') || false
          }));

        console.log('Formatted and filtered (testnet only) chains:', formattedChains);

        // Check if any chains remain after filtering
        if (formattedChains.length === 0) {
           console.warn('No enabled testnet chains found after filtering.');
           // Set options to empty to trigger the "No supported chains" message in renderChainSelector
           setChainOptions([]);
           // Optionally set an error message
           // setChainsError('No enabled testnet chains are currently available.'); 
        } else {
            // Sort the chains: ZetaChain first, then enabled, then disabled, then alphabetically
            const sortedChains = formattedChains.sort((a, b) => {
              if (a.isZetaChain && !b.isZetaChain) return -1;
              if (!a.isZetaChain && b.isZetaChain) return 1;
              if (!a.disabled && b.disabled) return -1; // Enabled before disabled
              if (a.disabled && !b.disabled) return 1;
              return a.label.localeCompare(b.label); // Alphabetical
            });
          
            console.log('Sorted chain options to be set:', sortedChains);
            setChainOptions(sortedChains);
          
            // Ensure ZetaChain ('7001') is selected by default if available and enabled
            const zetaChainOption = sortedChains.find(c => c.value === '7001' && !c.disabled);
            if (zetaChainOption && !selectedChains.includes('7001')) {
              // Only add ZetaChain if it's not already there
              // Note: ChainSelector might expect unique values; handle potential duplicates if necessary
              console.log('Adding default ZetaChain selection');
              setSelectedChains(prev => [...new Set(['7001', ...prev])]); 
            } else if (!zetaChainOption) {
               console.warn('ZetaChain (7001) is not available or disabled in the fetched chains.');
               // Consider clearing selection or selecting the first available enabled chain?
               // setSelectedChains(prev => prev.filter(c => c !== '7001')); 
            }
        }
      } catch (error) {
        console.error('Error fetching/processing supported chains:', error);
        setChainsError(`Failed to load chains: ${error.message}. Using fallback.`);
        
        // Fallback to minimal default testnet chains
        setChainOptions([
          { value: '7001', label: 'ZetaChain Athens', isZetaChain: true, disabled: false, comingSoon: false },
          // Add other critical fallbacks if needed
        ]);
         // Ensure ZetaChain is selected in fallback
         if (!selectedChains.includes('7001')) {
            setSelectedChains(['7001']);
         }
      } finally {
        // Ensure loading state is always turned off
        setChainsLoading(false);
        console.log('Finished fetching chains, loading set to false.');
      }
    };

    fetchSupportedChains();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount. Re-fetching based on selectedChains seems incorrect here.
  
  // Function to reload chains if needed
  const reloadChains = async () => {
    try {
      setChainsLoading(true);
      setChainsError(null);
      console.log('Reloading supported chains...');

      const chains = await apiService.getSupportedChains();
      console.log('API returned chains:', chains);
      
      // Transform API response to match the component's expected format
      if (chains && chains.length > 0) {
        const formattedChains = chains
          .filter(chain => chain.is_testnet === true || chain.testnet === true) // Only include testnet chains
          .map(chain => ({
            value: chain.chain_id || chain.id,
            label: chain.name,
            disabled: !chain.enabled, // Disabled if not enabled
            comingSoon: !chain.enabled, // Show "Coming Soon" badge for disabled chains
            isZetaChain: chain.chain_id === '7001' || chain.id === '7001' || chain.isZetaChain || false
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
        
        console.log('Formatted chain options:', sortedChains);
        setChainOptions(sortedChains);
      } else {
        throw new Error('No chains returned from API');
      }
    } catch (error) {
      console.error('Error reloading chains:', error);
      setChainsError(`Failed to load chains: ${error.message}`);
    } finally {
      setChainsLoading(false);
    }
  };
  
  // Cleanup interval on component unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);
  
  // Add a deployment confirmation component
  const DeploymentConfirmation = ({ deploymentDetails }) => {
    if (!deploymentDetails) return null;
    
    return (
      <FormContainer>
        <SectionTitle>🎉 NFT Collection Successfully Deployed!</SectionTitle>
        
        <div style={{ marginBottom: '16px' }}>
          <p><strong>Collection Name:</strong> {deploymentDetails.collection_name}</p>
          <p><strong>Symbol:</strong> {deploymentDetails.collection_symbol}</p>
          <p><strong>Max Supply:</strong> {deploymentDetails.max_supply}</p>
          <p><strong>Base URI:</strong> {deploymentDetails.base_uri}</p>
        </div>
        
        <SectionTitle>Deployed Contracts</SectionTitle>
        
        <div>
          {deploymentDetails.chainInfo && deploymentDetails.chainInfo.map((chain, index) => (
            <div key={`chain-${chain.chainId || index}`} style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(60, 157, 242, 0.1)', borderRadius: '8px' }}>
              <p><strong>Network:</strong> {chain.name || `Chain ${chain.chainId}`}</p>
              <p><strong>Contract:</strong> {chain.contractAddress || chain.contract_address}</p>
              <p><strong>Status:</strong> {chain.deploymentStatus || chain.status || 'Unknown'}</p>
              {chain.contract_url && (
                <p>
                  <a href={chain.contract_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>
                    View on Explorer
                  </a>
                </p>
              )}
            </div>
          ))}
        </div>
      </FormContainer>
    );
  };
  
  // Render chain selector with proper support for loading/error states
  const renderChainSelector = () => {
    if (chainsLoading) {
      return (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid rgba(0,0,0,0.1)', borderLeft: '4px solid var(--accent-primary)', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 1s linear infinite' }}></div>
          <p>Loading supported chains...</p>
        </div>
      );
    }
    
    if (chainsError) {
      return (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p style={{ color: 'var(--error)' }}>Error loading chains: {chainsError}</p>
          <button 
            onClick={reloadChains}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: 'var(--accent-primary)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              marginTop: '12px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    
    // Use the chainOptions directly instead of the chains state
    if (!chainOptions || chainOptions.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p>No supported chains available. Please check backend configuration.</p>
          <button 
            onClick={reloadChains}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: 'var(--accent-primary)', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px', 
              marginTop: '12px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      );
    }
    
    console.log('Rendering ChainSelector with options:', chainOptions);
    
    return (
      <ChainSelector 
        options={chainOptions}
        value={selectedChains}
        onChange={handleChainSelection}
        error={errors.chains}
        helperText="Select the chains to deploy your NFT collection to. ZetaChain is required."
      />
    );
  };
  
  const renderDeploymentStatus = () => {
    switch (deploymentStatus) {
      case 'creating':
      case 'fee_payment':
      case 'deploying':
        return (
          <FormContainer>
            <SectionTitle>Deployment in Progress</SectionTitle>
            <div style={{ textAlign: 'center', margin: '20px 0' }}>
              {/* Add spinner or loading animation here */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ width: '40px', height: '40px', border: '4px solid rgba(0,0,0,0.1)', borderLeft: '4px solid var(--accent-primary)', borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }}></div>
                <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              </div>
              <p>{processingStep}</p>
              {txHash && (
                <p style={{ marginTop: '16px' }}>
                  <a 
                    href={`https://explorer.athens.zetachain.com/tx/${txHash}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    View Transaction on ZetaChain Explorer
                  </a>
                </p>
              )}
            </div>
          </FormContainer>
        );
      
      case 'completed':
        return <DeploymentConfirmation deploymentDetails={deploymentDetails} />;
      
      case 'error':
      case 'failed':
        return (
          <FormContainer>
            <SectionTitle>Deployment Failed</SectionTitle>
            <ErrorMessage>{processingStep}</ErrorMessage>
            <ButtonContainer>
              <DeployButton onClick={() => setDeploymentStatus(null)}>
                Try Again
              </DeployButton>
            </ButtonContainer>
          </FormContainer>
        );
      
      default:
        return (
          <form onSubmit={handleSubmit}>
            <FormContainer>
              <SectionTitle>NFT Collection Details</SectionTitle>
              <FormRow>
                <FormGroup>
                  <FormInput
                    label="Collection Name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="My Awesome NFTs"
                    error={errors.name}
                  />
                </FormGroup>
                <FormGroup>
                  <FormInput
                    label="Symbol"
                    name="symbol"
                    value={formData.symbol}
                    onChange={handleInputChange}
                    placeholder="NFT"
                    error={errors.symbol}
                  />
                </FormGroup>
              </FormRow>
              
              <FormRow>
                <FormGroup>
                  <FormInput
                    label="Base URI"
                    name="baseUri"
                    value={formData.baseUri}
                    onChange={handleInputChange}
                    placeholder="https://example.com/metadata/"
                    error={errors.baseUri}
                  />
                </FormGroup>
                <FormGroup>
                  <FormInput
                    label="Max Supply"
                    name="maxSupply"
                    type="number"
                    value={formData.maxSupply}
                    onChange={handleInputChange}
                    placeholder="10000"
                    error={errors.maxSupply}
                  />
                </FormGroup>
              </FormRow>
              
              <FullWidthFormGroup>
                <ImageUpload
                  label="Collection Image"
                  onImageChange={handleImageUpload}
                  error={errors.image}
                />
              </FullWidthFormGroup>
            </FormContainer>
            
            <FormContainer>
              <SectionTitle>Select Chains</SectionTitle>
              {renderChainSelector()}
            </FormContainer>
            
            <FormContainer>
              <SectionTitle>Fee Information</SectionTitle>
              <FeeInfo>
                <FeeTitle>Deployment Fee</FeeTitle>
                <FeeDetail>To deploy your NFT collection, a one-time fee of {ZETA_FEE} ZETA is required.</FeeDetail>
                <FeeDetail>This fee covers gas costs and contract deployment across all selected chains.</FeeDetail>
                
                {balanceData && (
                  <BalanceInfo hasError={parseFloat(balanceData.formatted) < ZETA_FEE}>
                    Your balance: {parseFloat(balanceData.formatted).toFixed(2)} ZETA
                    {parseFloat(balanceData.formatted) < ZETA_FEE && ' (Insufficient balance)'}
                  </BalanceInfo>
                )}
              </FeeInfo>
            </FormContainer>
            
            <ButtonContainer>
              <DeployButton 
                type="submit" 
                disabled={!isConnected || !isZetaChainNetwork || (balanceData && parseFloat(balanceData.formatted) < ZETA_FEE)}
              >
                Deploy NFT Collection
              </DeployButton>
              
              {/* Debug button */}
              <button 
                type="button" 
                onClick={async () => {
                  console.log('Debug button clicked');
                  const testData = {
                    collection_name: "Test Collection",
                    collection_symbol: "TEST",
                    base_uri: "https://example.com/metadata/",
                    max_supply: 1000,
                    selected_chains: ["7001"],
                    deployer_address: address
                  };
                  
                  console.log('Testing API call with data:', testData);
                  try {
                    const response = await apiService.deployNFTCollection(testData);
                    console.log('API response:', response);
                  } catch (error) {
                    console.error('API call error:', error);
                  }
                }}
                style={{ 
                  marginLeft: '10px',
                  padding: '14px 32px',
                  background: '#666',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                Test API Call
              </button>
            </ButtonContainer>
            
            {errors.network && <ErrorMessage>{errors.network}</ErrorMessage>}
            {errors.balance && <ErrorMessage>{errors.balance}</ErrorMessage>}
          </form>
        );
    }
  };

  return (
    <PageContainer embedded={embedded}>
      <PageTitle>Launch NFT Collection</PageTitle>
      <BackendNotice>
        <strong>Note:</strong> This feature is connected to the backend API at http://localhost:8000. 
        If you encounter errors during NFT deployment, please ensure the backend is running and properly configured.
      </BackendNotice>
      {renderDeploymentStatus()}
    </PageContainer>
  );
};

export default LaunchNFTPage; 