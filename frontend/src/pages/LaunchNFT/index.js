import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAccount, useBalance, useChainId, useSendTransaction } from 'wagmi';
import { parseEther } from 'ethers';
import FormInput from '../../components/FormInput';
import ImageUpload from '../../components/ImageUpload';
import DistributionInput from '../../components/DistributionInput';
import ChainSelector from '../../components/ChainSelector';

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
const UNIVERSAL_TOKEN_SERVICE_WALLET = '0x123456789abcdef123456789abcdef123456789'; // Replace with actual service wallet

const LaunchNFTPage = ({ embedded = false }) => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: balanceData } = useBalance({
    address,
    chainId: 7001, // ZetaChain Athens testnet
  });
  const { sendTransaction } = useSendTransaction();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    quantity: '',
    price: '',
  });
  
  const [errors, setErrors] = useState({});
  const [nftImage, setNftImage] = useState(null);
  const [selectedChains, setSelectedChains] = useState([]);
  const [distributions, setDistributions] = useState([]);
  const [deploymentStatus, setDeploymentStatus] = useState(null);
  const [deploymentDetails, setDeploymentDetails] = useState(null);
  
  const isZetaChainNetwork = chainId === 7001; // ZetaChain Athens testnet
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };
  
  const handleImageUpload = (imageFile) => {
    setNftImage(imageFile);
  };
  
  const handleChainSelection = (chains) => {
    setSelectedChains(chains);
  };
  
  const handleDistributionsChange = (newDistributions) => {
    setDistributions(newDistributions);
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    // Network validation
    if (!isZetaChainNetwork) {
      newErrors.network = 'Please switch to ZetaChain network';
      return false;
    }

    // Balance validation
    if (balanceData && parseFloat(balanceData.formatted) < ZETA_FEE) {
      newErrors.balance = `Insufficient ZETA balance. You need at least ${ZETA_FEE} ZETA. Current balance: ${parseFloat(balanceData.formatted).toFixed(2)} ZETA`;
      return false;
    }
    
    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Collection name is required';
    }
    
    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }
    
    // Quantity validation
    if (!formData.quantity || parseInt(formData.quantity) <= 0) {
      newErrors.quantity = 'Quantity must be a positive number';
    }
    
    // Price validation
    if (!formData.price || parseFloat(formData.price) < 0) {
      newErrors.price = 'Price must be a non-negative number';
    }
    
    // Image validation
    if (!nftImage) {
      newErrors.image = 'Please upload an image for your NFT collection';
    }
    
    // Selected chains validation
    if (selectedChains.length === 0) {
      newErrors.chains = 'Please select at least one chain';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setDeploymentStatus('creating');
      
      // Create FormData for NFT collection creation
      const formDataToSend = new FormData();
      formDataToSend.append('collection_name', formData.name);
      formDataToSend.append('description', formData.description);
      formDataToSend.append('quantity', formData.quantity);
      formDataToSend.append('price', formData.price);
      formDataToSend.append('selected_chains', JSON.stringify(selectedChains.map(id => id.toString())));
      
      // Format distribution data
      if (distributions.length > 0) {
        const distributionsForBackend = distributions.map(dist => ({
          recipient_address: dist.address,
          chain_id: chainId.toString(),
          nft_quantity: dist.amount || 1
        }));
        formDataToSend.append('distributions_json', JSON.stringify(distributionsForBackend));
      }
      
      // Append NFT image
      if (nftImage) {
        formDataToSend.append('image', nftImage);
      }
      
      // Mock API call - in a real app, this would communicate with your backend
      // const response = await apiService.createNFTCollection(formDataToSend);
      // setDeploymentDetails(response);
      
      // For now, simulate a response
      setDeploymentDetails({
        id: Math.floor(Math.random() * 1000),
        name: formData.name,
        description: formData.description,
        quantity: formData.quantity,
        price: formData.price
      });
      
      // Handle fee payment
      const feeInWei = parseEther(ZETA_FEE.toString());
      
      const txResult = await sendTransaction({
        to: UNIVERSAL_TOKEN_SERVICE_WALLET,
        value: feeInWei
      });
      
      if (!txResult || !txResult.hash) {
        throw new Error('Transaction failed: No transaction hash returned');
      }
      
      // Update deployment status to pending
      setDeploymentStatus('pending');
      
      // In a real app, you would call your API to start the deployment process
      // await apiService.deployNFTCollection(response.id, {
      //   fee_paid_tx: txResult.hash
      // });
      
      // For now, simulate success after 3 seconds
      setTimeout(() => {
        setDeploymentStatus('success');
      }, 3000);
      
    } catch (error) {
      console.error('Error:', error);
      setDeploymentStatus('error');
      setErrors({...errors, submission: error.message});
    }
  };
  
  // Render deployment status
  const renderDeploymentStatus = () => {
    switch (deploymentStatus) {
      case 'creating':
        return <p>Creating NFT collection configuration...</p>;
      case 'pending':
        return <p>Deploying NFT collection. This may take a few minutes...</p>;
      case 'success':
        return (
          <div>
            <h3>Success! Your NFT collection has been deployed.</h3>
            <p>Collection Name: {deploymentDetails?.name}</p>
            <p>Quantity: {deploymentDetails?.quantity}</p>
            <p>Price: {deploymentDetails?.price}</p>
          </div>
        );
      case 'error':
        return (
          <ErrorMessage>
            <p>Error deploying NFT collection. Please try again.</p>
            {errors.submission && <p>{errors.submission}</p>}
          </ErrorMessage>
        );
      default:
        return null;
    }
  };
  
  return (
    <PageContainer embedded={embedded}>
      <PageTitle embedded={embedded}>Create Universal NFT Collection</PageTitle>
      
      {deploymentStatus ? (
        <FormContainer>
          <SectionTitle>Deployment Status</SectionTitle>
          {renderDeploymentStatus()}
        </FormContainer>
      ) : (
        <form onSubmit={handleSubmit}>
          <FormContainer>
            <SectionTitle>Collection Details</SectionTitle>
            <FormRow>
              <FormGroup>
                <FormInput
                  label="Collection Name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  error={errors.name}
                />
              </FormGroup>
              <FormGroup>
                <FormInput
                  label="Price (in ZETA)"
                  name="price"
                  type="number"
                  value={formData.price}
                  onChange={handleInputChange}
                  error={errors.price}
                />
              </FormGroup>
            </FormRow>
            <FormRow>
              <FormGroup>
                <FormInput
                  label="Quantity"
                  name="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  error={errors.quantity}
                />
              </FormGroup>
              <FormGroup>
                {/* Empty form group to maintain grid layout */}
              </FormGroup>
            </FormRow>
            <FormRow>
              <FullWidthFormGroup>
                <FormInput
                  label="Description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  multiline
                  error={errors.description}
                />
              </FullWidthFormGroup>
            </FormRow>
          </FormContainer>
          
          <FormContainer>
            <SectionTitle>Collection Image</SectionTitle>
            <ImageUpload 
              onImageUpload={handleImageUpload}
              error={errors.image}
            />
          </FormContainer>
          
          <FormContainer>
            <SectionTitle>Target Chains</SectionTitle>
            <ChainSelector 
              onSelectionChange={handleChainSelection}
              error={errors.chains}
            />
          </FormContainer>
          
          <FormContainer>
            <SectionTitle>Free NFT Distribution (Optional)</SectionTitle>
            <p style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              Add wallet addresses that will each receive 1 free NFT from your collection. 
              Each recipient address will receive exactly one NFT regardless of the amount specified.
            </p>
            <DistributionInput 
              onDistributionsChange={handleDistributionsChange}
            />
          </FormContainer>
          
          <FormContainer>
            <SectionTitle>Deployment Fee</SectionTitle>
            <FeeInfo>
              <FeeTitle>Required Fee Information</FeeTitle>
              <FeeDetail>Deployment Fee: {ZETA_FEE} ZETA</FeeDetail>
              <FeeDetail>This fee covers the deployment of your NFT collection across all selected chains.</FeeDetail>
              
              {balanceData && (
                <BalanceInfo hasError={parseFloat(balanceData.formatted) < ZETA_FEE}>
                  Your Balance: {parseFloat(balanceData.formatted).toFixed(4)} ZETA
                </BalanceInfo>
              )}
              
              {errors.network && <ErrorMessage>{errors.network}</ErrorMessage>}
              {errors.balance && <ErrorMessage>{errors.balance}</ErrorMessage>}
            </FeeInfo>
            
            <ButtonContainer>
              <DeployButton 
                type="submit" 
                disabled={!isConnected || !isZetaChainNetwork || (balanceData && parseFloat(balanceData.formatted) < ZETA_FEE)}
              >
                Create NFT Collection
              </DeployButton>
            </ButtonContainer>
            
            {errors.submission && <ErrorMessage>{errors.submission}</ErrorMessage>}
          </FormContainer>
        </form>
      )}
    </PageContainer>
  );
};

export default LaunchNFTPage; 