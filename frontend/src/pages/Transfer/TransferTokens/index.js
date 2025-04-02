import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAccount, useChainId } from 'wagmi';
import FormInput from '../../../components/FormInput';
import TokenTile, { chainLogos, chainNames } from '../../../components/TokenTile';
import apiService from '../../../services/apiService';
import { executeCrossChainTransfer } from '../../../utils/contractInteractions';
import { switchToZetaChain } from '../../../utils/networkSwitchingUtility';
import { CHAIN_IDS } from '../../../utils/contracts';
import { formatTokenBalance } from '../../../utils/tokenUtils';

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

const TokenCountText = styled.p`
  font-size: 16px;
  color: var(--text-secondary);
  margin-bottom: 20px;
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

const TokenSection = styled.div`
  margin-bottom: 32px;
`;

const TokenHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
`;

const TokenIcon = styled.img`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #fff;
`;

const TokenTitle = styled.h2`
  font-size: 1.5rem;
  margin: 0;
  color: var(--text-primary);
`;

const TokenSymbol = styled.span`
  font-size: 1rem;
  color: var(--text-secondary);
  margin-left: 8px;
`;

const TokenGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
  margin-top: 16px;
`;

const SelectedTokenSection = styled.div`
  background: var(--card-bg);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 32px;
`;

const SelectedTokenHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
`;

const SelectedTokenInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const SelectedTokenTitle = styled.h3`
  font-size: 1.25rem;
  margin: 0;
  color: var(--text-primary);
`;

const SelectedTokenSymbol = styled.span`
  font-size: 1rem;
  color: var(--text-secondary);
  margin-left: 8px;
`;

const SelectedChainInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SelectedChainLogo = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
`;

const SelectedChainName = styled.div`
  font-size: 1rem;
  color: var(--text-primary);
  font-weight: 500;
`;

const SelectedBalance = styled.div`
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 32px;
`;

const TransferButton = styled.button`
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

const NetworkButton = styled(TransferButton)`
  background-color: transparent;
  border: 1px solid var(--accent-primary);
  color: var(--accent-primary);
  font-size: 14px;
  padding: 10px 16px;
  margin-left: 16px;
`;

const TransferResultCard = styled.div`
  margin-top: 30px;
  padding: 20px;
  border-radius: 8px;
  background-color: rgba(0, 232, 181, 0.1);
  border: 1px solid var(--accent-secondary);
  color: var(--text-primary);
`;

const TransactionHash = styled.a`
  display: block;
  margin-top: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--accent-primary);
  text-decoration: underline;
`;

const ResultTitle = styled.h4`
  margin-bottom: 15px;
  color: var(--accent-secondary);
`;

const NetworkWarning = styled.div`
  background-color: rgba(255, 180, 0, 0.1);
  border: 1px solid #ffb400;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const PaginationContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 24px;
  margin-bottom: 16px;
  gap: 16px;
`;

const PaginationButton = styled.button`
  background-color: ${props => props.active ? 'var(--accent-primary)' : 'transparent'};
  color: ${props => props.active ? 'white' : 'var(--text-primary)'};
  border: 1px solid ${props => props.active ? 'var(--accent-primary)' : 'var(--border-color)'};
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.5 : 1};
  
  &:hover:not(:disabled) {
    background-color: ${props => props.active ? 'var(--accent-primary)' : 'rgba(0, 0, 0, 0.05)'};
  }
`;

const PageInfo = styled.span`
  display: flex;
  align-items: center;
  font-size: 14px;
  color: var(--text-secondary);
`;

const SortControls = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
`;

const SortSelect = styled.select`
  background-color: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  padding: 8px;
  border-radius: 4px;
  font-size: 14px;
`;

// Add these new styled components for the floating transfer box
const FloatingTransferBox = styled.div`
  position: fixed;
  top: 100px;
  right: 24px;
  width: 320px;
  background-color: var(--card-bg);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 20px;
  z-index: 100;
  max-height: calc(100vh - 150px);
  overflow-y: auto;
  border: 2px solid var(--accent-primary);
  
  @media (max-width: 1200px) {
    position: static;
    width: 100%;
    margin-top: 24px;
    max-height: none;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 18px;
  cursor: pointer;
  line-height: 1;
  
  &:hover {
    color: var(--accent-primary);
  }
`;

const TransferBoxTitle = styled.h3`
  font-size: 18px;
  margin: 0 0 16px 0;
  color: var(--text-primary);
  padding-right: 20px;
`;

const TokenSelectionDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding: 12px;
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.05);
`;

const ChainSelectionHeader = styled.div`
  margin: 20px 0 12px 0;
  font-weight: 600;
  color: var(--text-primary);
`;

const DestinationChainGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 16px;
`;

const DestinationChainTile = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  border-radius: 8px;
  border: 2px solid ${props => props.selected ? 'var(--accent-primary)' : 'var(--border-color)'};
  background-color: ${props => props.selected ? 'var(--accent-primary-transparent)' : 'transparent'};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.5 : 1};
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    border-color: var(--accent-primary);
  }
`;

const ChainLogo = styled.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  margin-bottom: 4px;
`;

const ChainName = styled.div`
  font-size: 12px;
  text-align: center;
`;

const TransferTokens = ({ embedded = false }) => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  
  const [userTokens, setUserTokens] = useState([]);
  const [totalTokenCount, setTotalTokenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [transferResult, setTransferResult] = useState(null);
  const [processingStatus, setProcessingStatus] = useState("");
  const [error, setError] = useState(null);
  const [switchingNetwork, setSwitchingNetwork] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [tokensPerPage] = useState(10);
  const [displayedTokens, setDisplayedTokens] = useState([]);
  
  // Sorting state
  const [sortOption, setSortOption] = useState('balanceDesc');
  
  const [formData, setFormData] = useState({
    tokenId: '',
    sourceChain: '',
    destinationChain: '',
    transferAmount: '',
    recipientAddress: ''
  });

  // Check if the user is on the correct network
  const isZetaChainNetwork = chainId === CHAIN_IDS.ZETACHAIN;

  // New state for controlling the floating transfer box
  const [showTransferBox, setShowTransferBox] = useState(false);

  // Handle network switch
  const handleSwitchToZetaChain = async () => {
    try {
      setSwitchingNetwork(true);
      const success = await switchToZetaChain();
      if (!success) {
        setError("Failed to switch to ZetaChain network. Please switch manually in your wallet.");
      }
    } catch (error) {
      console.error('Error switching to ZetaChain:', error);
      setError("Failed to switch to ZetaChain network: " + error.message);
    } finally {
      setSwitchingNetwork(false);
    }
  };

  // All supported chains
  const supportedChains = [
    { id: '7001', name: chainNames['7001'], logo: chainLogos['7001'] },
    { id: '11155111', name: chainNames['11155111'], logo: chainLogos['11155111'] },
    { id: '97', name: chainNames['97'], logo: chainLogos['97'] },
    { id: '84532', name: chainNames['84532'], logo: chainLogos['84532'] },
    { id: 'solana', name: chainNames['solana'], logo: chainLogos['solana'], disabled: true },
    { id: 'sui', name: chainNames['sui'], logo: chainLogos['sui'], disabled: true },
    { id: 'ton', name: chainNames['ton'], logo: chainLogos['ton'], disabled: true }
  ];

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleTokenSelect = (tokenId, chainId) => {
    setFormData({
      ...formData,
      tokenId,
      sourceChain: chainId,
      destinationChain: '',  // Reset destination chain when source changes
      transferAmount: '',    // Reset amount when source changes
      recipientAddress: ''   // Reset recipient when source changes
    });
    
    // Show the transfer box when a token is selected
    setShowTransferBox(true);
  };

  const handleDestinationSelect = (chainId) => {
    // Updated to set a single destination chain instead of an array
    setFormData({
      ...formData,
      destinationChain: formData.destinationChain === chainId ? '' : chainId
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    try {
      setTransferring(true);
      setProcessingStatus("Initiating transfer...");
      setTransferResult(null);
      
      // Get the selected token
      const selectedToken = userTokens.find(token => token.id === formData.tokenId);
      if (!selectedToken) {
        throw new Error("Selected token not found");
      }
      
      // Get contract address for the source chain
      const tokenContract = selectedToken.chainInfo.find(
        chain => chain.chain_id === formData.sourceChain
      );
      
      if (!tokenContract || !tokenContract.contract_address) {
        throw new Error(`Contract address not found for chain ID ${formData.sourceChain}`);
      }
      
      setProcessingStatus("Connecting to wallet...");
      
      // Use direct contract interaction instead of API
      const result = await executeCrossChainTransfer({
        sourceChain: formData.sourceChain,
        destinationChain: formData.destinationChain,
        tokenAddress: tokenContract.contract_address,
        recipientAddress: formData.recipientAddress || address,
        amount: formData.transferAmount
      });
      
      console.log('Transfer result:', result);
      setTransferResult(result);
      
      // Reset form but keep token and source chain selected
      setFormData({
        ...formData,
        transferAmount: '',
        recipientAddress: ''
      });
    } catch (error) {
      console.error('Transfer failed:', error);
      setError(error.message);
    } finally {
      setTransferring(false);
      setProcessingStatus("");
    }
  };

  // Sort tokens based on the selected option
  const sortTokens = (tokens, option) => {
    if (!tokens || tokens.length === 0) return [];
    
    const sortedTokens = [...tokens];
    
    // Helper to safely convert token balance strings to numbers
    const safeParseBalance = (balance) => {
      if (!balance) return 0;
      
      try {
        // For very large numbers, just use the first few digits for sorting
        // This avoids precision issues with Number
        if (balance.length > 15) {
          return Number(balance.substring(0, 15));
        }
        return Number(balance || '0');
      } catch (e) {
        console.error('Error parsing balance:', e);
        return 0;
      }
    };
    
    switch (option) {
      case 'balanceDesc':
        // Sort by highest total balance first
        return sortedTokens.sort((a, b) => {
          const aTotal = a.balances ? Object.values(a.balances).reduce(
            (sum, val) => sum + safeParseBalance(val), 0
          ) : 0;
          
          const bTotal = b.balances ? Object.values(b.balances).reduce(
            (sum, val) => sum + safeParseBalance(val), 0
          ) : 0;
          
          return bTotal - aTotal;
        });
        
      case 'balanceAsc':
        // Sort by lowest total balance first
        return sortedTokens.sort((a, b) => {
          const aTotal = a.balances ? Object.values(a.balances).reduce(
            (sum, val) => sum + safeParseBalance(val), 0
          ) : 0;
          
          const bTotal = b.balances ? Object.values(b.balances).reduce(
            (sum, val) => sum + safeParseBalance(val), 0
          ) : 0;
          
          return aTotal - bTotal;
        });
        
      case 'nameAsc':
        // Sort alphabetically by name
        return sortedTokens.sort((a, b) => 
          a.name.toLowerCase() > b.name.toLowerCase() ? 1 : -1
        );
        
      case 'nameDesc':
        // Sort reverse alphabetically by name
        return sortedTokens.sort((a, b) => 
          a.name.toLowerCase() < b.name.toLowerCase() ? 1 : -1
        );
        
      case 'symbolAsc':
        // Sort alphabetically by symbol
        return sortedTokens.sort((a, b) => 
          a.symbol.toLowerCase() > b.symbol.toLowerCase() ? 1 : -1
        );
        
      case 'symbolDesc':
        // Sort reverse alphabetically by symbol
        return sortedTokens.sort((a, b) => 
          a.symbol.toLowerCase() < b.symbol.toLowerCase() ? 1 : -1
        );
        
      default:
        return sortedTokens;
    }
  };
  
  // Handle sort option change
  const handleSortChange = (e) => {
    const option = e.target.value;
    setSortOption(option);
    const sorted = sortTokens(userTokens, option);
    setUserTokens(sorted);
    updateDisplayedTokens(sorted, currentPage, tokensPerPage);
  };

  // Fetch user's tokens - only if connected, regardless of network
  useEffect(() => {
    const fetchUserTokens = async () => {
      if (isConnected && address) {
        try {
          setLoading(true);
          // Fetch tokens regardless of which network the user is on
          const tokens = await apiService.getUserTokens(address);
          console.log('Tokens fetched successfully:', tokens);
          
          // Sort tokens based on current sort option
          const sortedTokens = sortTokens(tokens, sortOption);
          
          // Set total token count for pagination
          setTotalTokenCount(sortedTokens.length);
          setUserTokens(sortedTokens);
          
          // Update displayed tokens based on pagination
          updateDisplayedTokens(sortedTokens, currentPage, tokensPerPage);
        } catch (error) {
          console.error('Error fetching user tokens:', error);
          // Keep the UI functional with empty tokens rather than breaking
          setUserTokens([]);
          setDisplayedTokens([]);
          setTotalTokenCount(0);
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchUserTokens();
  }, [isConnected, address, currentPage, tokensPerPage, sortOption]);

  // Update displayed tokens based on pagination
  const updateDisplayedTokens = (tokens, page, perPage) => {
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    setDisplayedTokens(tokens.slice(startIndex, endIndex));
  };

  // Handle page change for pagination
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    updateDisplayedTokens(userTokens, newPage, tokensPerPage);
  };

  // Calculate total pages for pagination
  const totalPages = Math.ceil(totalTokenCount / tokensPerPage);

  const selectedToken = formData.tokenId ? 
    userTokens.find(token => token.id === formData.tokenId) : null;

  // Get available destination chains
  const getAvailableDestinationChains = () => {
    if (!selectedToken) return [];
    
    // Return all supported chains except the source chain
    return supportedChains.filter(chain => 
      chain.id !== formData.sourceChain && 
      // Only show chains that the token is deployed on
      selectedToken.deployedChains.includes(chain.id)
    );
  };

  // Close the transfer box
  const handleCloseTransferBox = () => {
    setShowTransferBox(false);
    // Reset the form data
    setFormData({
      tokenId: '',
      sourceChain: '',
      destinationChain: '',
      transferAmount: '',
      recipientAddress: ''
    });
  };

  return (
    <PageContainer embedded={embedded.toString()}>
      <PageTitle embedded={embedded.toString()}>Transfer Your Universal Tokens</PageTitle>
      
      {/* Display network warning if not on ZetaChain */}
      {isConnected && !isZetaChainNetwork && (
        <NetworkWarning>
          <p>Please switch to ZetaChain network to view and transfer your tokens.</p>
          <NetworkButton 
            onClick={handleSwitchToZetaChain}
            disabled={switchingNetwork}
          >
            {switchingNetwork ? 'Switching...' : 'Switch to ZetaChain'}
          </NetworkButton>
        </NetworkWarning>
      )}
      
      {loading ? (
        <FormContainer>
          <p>Loading your tokens...</p>
        </FormContainer>
      ) : userTokens.length === 0 ? (
        <FormContainer>
          <p>You don't have any universal tokens to transfer. Launch a new token first!</p>
        </FormContainer>
      ) : (
        <>
          <form onSubmit={handleSubmit}>
            <FormContainer>
              <SectionTitle>Your Universal Tokens</SectionTitle>
              <TokenCountText>
                {totalTokenCount} token{totalTokenCount !== 1 ? 's' : ''} found
              </TokenCountText>
              
              {/* Sorting controls */}
              <SortControls>
                <SortSelect 
                  value={sortOption}
                  onChange={handleSortChange}
                >
                  <option value="balanceDesc">Highest Balance</option>
                  <option value="balanceAsc">Lowest Balance</option>
                  <option value="nameAsc">Name (A-Z)</option>
                  <option value="nameDesc">Name (Z-A)</option>
                  <option value="symbolAsc">Symbol (A-Z)</option>
                  <option value="symbolDesc">Symbol (Z-A)</option>
                </SortSelect>
              </SortControls>
              
              {/* Show all tokens grouped by name */}
              {displayedTokens.map(token => (
                <TokenSection key={token.id}>
                  <TokenHeader>
                    <TokenIcon 
                      src={token.iconUrl || '/chain-logos/zetachain.svg'} 
                      alt={`${token.symbol} icon`}
                    />
                    <TokenTitle>
                      {token.name}
                      <TokenSymbol>{token.symbol}</TokenSymbol>
                    </TokenTitle>
                  </TokenHeader>
                  <TokenGrid>
                    {token.deployedChains && token.deployedChains.map(chainId => {
                      const chainInfo = token.chainInfo.find(info => info.chain_id === chainId);
                      const balance = chainInfo ? chainInfo.balance : '0';
                      
                      return (
                        <TokenTile
                          key={`${token.id}-${chainId}`}
                          token={token}
                          chainId={chainId}
                          balance={balance}
                          selected={formData.tokenId === token.id && formData.sourceChain === chainId}
                          onClick={handleTokenSelect}
                        />
                      );
                    })}
                  </TokenGrid>
                </TokenSection>
              ))}
              
              {/* Pagination controls */}
              {totalPages > 1 && (
                <PaginationContainer>
                  <PaginationButton 
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </PaginationButton>
                  
                  <PageInfo>
                    Page {currentPage} of {totalPages}
                  </PageInfo>
                  
                  <PaginationButton 
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </PaginationButton>
                </PaginationContainer>
              )}
            </FormContainer>

            {/* Floating Transfer Box */}
            {showTransferBox && formData.tokenId && selectedToken && (
              <FloatingTransferBox>
                <CloseButton onClick={handleCloseTransferBox}>×</CloseButton>
                <TransferBoxTitle>Transfer {selectedToken.name}</TransferBoxTitle>
                
                {/* Source Chain Display */}
                <TokenSelectionDisplay>
                  <ChainLogo 
                    src={chainLogos[formData.sourceChain]} 
                    alt={`${chainNames[formData.sourceChain]} logo`}
                  />
                  <div>
                    <strong>{chainNames[formData.sourceChain]}</strong>
                    <div>
                      {formatTokenBalance(
                        selectedToken.chainInfo.find(c => c.chain_id === formData.sourceChain)?.balance || '0', 
                        selectedToken.decimals
                      )} {selectedToken.symbol}
                    </div>
                  </div>
                </TokenSelectionDisplay>
                
                {/* Destination Chain Selection */}
                <ChainSelectionHeader>Select destination:</ChainSelectionHeader>
                <DestinationChainGrid>
                  {getAvailableDestinationChains().map(chain => (
                    <DestinationChainTile
                      key={chain.id}
                      selected={formData.destinationChain === chain.id}
                      disabled={chain.disabled}
                      onClick={() => !chain.disabled && handleDestinationSelect(chain.id)}
                    >
                      <ChainLogo 
                        src={chain.logo} 
                        alt={`${chain.name} logo`}
                      />
                      <ChainName>{chain.name}</ChainName>
                    </DestinationChainTile>
                  ))}
                </DestinationChainGrid>
                
                {/* Transfer Amount & Recipient */}
                {formData.destinationChain && (
                  <>
                    <FormInput
                      id="transferAmount"
                      label={`Amount to Transfer (${selectedToken.symbol})`}
                      name="transferAmount"
                      type="number"
                      value={formData.transferAmount}
                      onChange={handleChange}
                      helperText={`Available: ${formatTokenBalance(
                        selectedToken.chainInfo.find(c => c.chain_id === formData.sourceChain)?.balance || '0', 
                        selectedToken.decimals
                      )} ${selectedToken.symbol}`}
                    />
                    
                    <FormInput
                      id="recipientAddress"
                      label="Recipient Address (Optional)"
                      name="recipientAddress"
                      value={formData.recipientAddress}
                      onChange={handleChange}
                      helperText="Leave empty to send to your own address"
                    />
                    
                    {/* Error message */}
                    {error && (
                      <div style={{ color: 'red', margin: '16px 0', fontSize: '14px' }}>
                        Error: {error}
                      </div>
                    )}
                    
                    {/* Processing status */}
                    {transferring && processingStatus && (
                      <div style={{ margin: '16px 0', fontSize: '14px' }}>
                        <p>{processingStatus}</p>
                      </div>
                    )}
                    
                    <ButtonContainer>
                      <TransferButton 
                        type="submit" 
                        disabled={
                          transferring || 
                          !formData.tokenId || 
                          !formData.destinationChain || 
                          !formData.transferAmount
                        }
                      >
                        {transferring ? 'Processing...' : 'Transfer Tokens'}
                      </TransferButton>
                    </ButtonContainer>
                  </>
                )}
              </FloatingTransferBox>
            )}
          </form>
          
          {transferResult && (
            <FormContainer>
              <TransferResultCard>
                <ResultTitle>Transfer Initiated Successfully!</ResultTitle>
                <p>
                  Transferring {transferResult.amount} tokens from {
                    selectedToken.name
                  } on {
                    chainNames[transferResult.sourceChain] || transferResult.sourceChain
                  } to {
                    chainNames[transferResult.destinationChains?.[0]] || transferResult.destinationChain
                  }
                </p>
                <p>Transaction hash: 
                  <TransactionHash 
                    href={`https://explorer.zetachain.com/tx/${transferResult.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {transferResult.transactionHash}
                  </TransactionHash>
                </p>
              </TransferResultCard>
            </FormContainer>
          )}
        </>
      )}
    </PageContainer>
  );
};

export default TransferTokens; 