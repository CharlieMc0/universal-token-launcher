import React, { useState } from 'react';
import styled from 'styled-components';
import { useAccount, useBalance, useSendTransaction, useChainId } from 'wagmi';
import { parseEther } from 'ethers';

// Components
import FormInput from '../../components/FormInput';
import ChainSelector from '../../components/ChainSelector';
import FileUpload from '../../components/FileUpload';
import ImageUpload from '../../components/ImageUpload';
import DistributionInput from '../../components/DistributionInput';
import DistributionList from '../../components/DistributionList';

// Utils
import { switchToZetaChain } from '../../utils/networkSwitchingUtility';
import { parseDistributionCSV } from '../../utils/csvParser';
import apiService from '../../services/apiService';

// Constants
const ZETA_FEE = 1; // 1 ZETA fee
const ZETACHAIN_ID = 7001; // Athens Testnet
const UNIVERSAL_TOKEN_SERVICE_WALLET = '0x4f1684A28E33F42cdf50AB96e29a709e17249E63'; // Actual wallet address

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
  
  const { sendTransaction } = useSendTransaction();
  
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
    
    try {
      // Create FormData to send to backend
      const formDataToSend = new FormData();
      formDataToSend.append('token_name', formData.name);
      formDataToSend.append('token_symbol', formData.symbol);
      formDataToSend.append('decimals', formData.decimals);
      formDataToSend.append('total_supply', formData.totalSupply);
      
      formDataToSend.append('selected_chains', JSON.stringify(formData.selectedChains));
      
      if (tokenIcon) {
        formDataToSend.append('icon', tokenIcon);
      }
      
      // Add distributions if available
      if (distributions.length > 0) {
        formDataToSend.append('distributions_json', JSON.stringify(distributions));
      } else if (csvFile) {
        formDataToSend.append('distributions_csv', csvFile);
      }
      
      // Send data to backend to create token configuration
      const response = await apiService.createToken(formDataToSend);
      console.log('Token created:', response);
      
      // Process fee payment transaction
      const feeInWei = parseEther(ZETA_FEE.toString());
      
      const txResult = await sendTransaction({
        to: UNIVERSAL_TOKEN_SERVICE_WALLET,
        value: feeInWei
      });
      
      if (!txResult || !txResult.hash) {
        throw new Error('Transaction failed: No transaction hash returned');
      }
      
      console.log('Fee payment successful:', txResult);
      
      // Start deployment with fee payment transaction
      await apiService.deployToken(response.tokenId, {
        fee_paid_tx: txResult.hash
      });
      
      // Redirect to a status page or show success
      alert(`Token deployment initiated! Token ID: ${response.tokenId}`);
      // In a full implementation, we would redirect to a status page:
      // window.location.href = `/tokens/${response.tokenId}/status`;
      
    } catch (error) {
      console.error('Error:', error);
      setErrors({...errors, submission: error.message});
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSwitchNetwork = async () => {
    await switchToZetaChain();
  };
  
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
  
  return (
    <PageContainer embedded={embedded.toString()}>
      <PageTitle embedded={embedded.toString()}>Launch Token</PageTitle>
      
      {!isZetaChainNetwork && (
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
      )}
      
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
                helperText="Click to select target chains. ZetaChain is required and will always be selected."
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
                  chainId={currentChainId.toString()}
                  error={errors.distributions}
                  helperText="Enter wallet addresses (one per line) and the amount each address should receive"
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
    </PageContainer>
  );
};

export default LaunchPage; 