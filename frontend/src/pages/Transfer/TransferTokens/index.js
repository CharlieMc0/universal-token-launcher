import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAccount, useChainId } from 'wagmi';
import FormInput from '../../../components/FormInput';
import TokenTile, { chainLogos, chainNames } from '../../../components/TokenTile';
import apiService from '../../../services/apiService';
import { executeCrossChainTransfer, mintTokens, isTokenOwner } from '../../../utils/contractInteractions';
import { switchToZetaChain } from '../../../utils/networkSwitchingUtility';
import { CHAIN_IDS } from '../../../utils/contracts';
import { formatTokenBalance } from '../../../utils/tokenUtils';
import { ethers } from 'ethers';

// Import our new enhanced components
import EnhancedTokenCard from '../../../components/EnhancedTokenCard';
import TokenSectionContainer from '../../../components/TokenSectionContainer';
import TokenFilterControls from '../../../components/TokenFilterControls';
import EnhancedTransferPanel from '../../../components/EnhancedTransferPanel';

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
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-subtle);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: var(--accent-primary);
  }
`;

// Add these new styled components for the floating transfer box
const FloatingTransferBox = styled.div`
  position: relative;
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 32px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-color);
`;

const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background: transparent;
  border: none;
  font-size: 24px;
  color: var(--text-secondary);
  cursor: pointer;
  
  &:hover {
    color: var(--text-primary);
  }
`;

const TransferBoxTitle = styled.h3`
  font-size: 1.25rem;
  margin-top: 0;
  margin-bottom: 20px;
  color: var(--text-primary);
`;

const TokenSelectionDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background-color: var(--bg-subtle);
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
`;

const ChainLogo = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: white;
`;

const ChainSelectionHeader = styled.div`
  font-size: 1rem;
  font-weight: 500;
  margin-top: 16px;
  margin-bottom: 12px;
  color: var(--text-primary);
`;

const DestinationChainGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
`;

const DestinationChainTile = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  background-color: ${props => props.selected ? 'rgba(0, 232, 181, 0.1)' : 'var(--bg-subtle)'};
  border: 1px solid ${props => props.selected ? 'var(--accent-primary)' : 'var(--border-color)'};
  opacity: ${props => props.disabled ? 0.5 : 1};
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    border-color: ${props => props.selected ? 'var(--accent-primary)' : 'var(--text-secondary)'};
  }
`;

const ChainName = styled.div`
  font-size: 0.9rem;
  font-weight: 500;
  margin-top: 8px;
  text-align: center;
  color: var(--text-primary);
`;

const StatusMessage = styled.div`
  margin: 16px 0;
  padding: 12px;
  border-radius: 8px;
  font-size: 14px;
  
  ${props => props.type === 'error' && `
    background-color: rgba(255, 0, 0, 0.1);
    border: 1px solid #ff0000;
    color: #d32f2f;
  `}
  
  ${props => props.type === 'success' && `
    background-color: rgba(0, 255, 0, 0.1);
    border: 1px solid #00c853;
    color: #00c853;
  `}
  
  ${props => props.type === 'info' && `
    background-color: rgba(3, 169, 244, 0.1);
    border: 1px solid #03a9f4;
    color: #0288d1;
  `}
`;

// Add new styled components for mint functionality
const TabContainer = styled.div`
  display: flex;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
`;

const Tab = styled.button`
  background: ${props => props.active ? 'var(--card-bg)' : 'transparent'};
  border: none;
  border-bottom: 2px solid ${props => props.active ? 'var(--accent-primary)' : 'transparent'};
  padding: 10px 20px;
  font-size: 16px;
  font-weight: ${props => props.active ? '600' : '500'};
  color: ${props => props.active ? 'var(--text-primary)' : 'var(--text-secondary)'};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    color: var(--text-primary);
  }
`;

const MintButton = styled(TransferButton)`
  background-color: #8a2be2;
  
  &:hover {
    background-color: #7722cc;
  }
`;

// Fix the duplicate CloseButton by renaming to ResultCloseButton
const ResultsBox = styled.div`
  position: fixed;
  top: 100px;
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 500px;
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  border: 2px solid ${props => props.success ? 'var(--accent-secondary)' : 'var(--error)'};
  z-index: 1000;
  text-align: center;
`;

const TxLink = styled.a`
  display: inline-block;
  color: var(--accent-primary);
  margin-top: 12px;
  text-decoration: none;
  
  &:hover {
    text-decoration: underline;
  }
`;

const ResultCloseButton = styled.button`
  background-color: transparent;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 16px;
  margin-top: 16px;
  color: var(--text-primary);
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    border-color: var(--accent-primary);
    color: var(--accent-primary);
  }
`;

const TransferTokens = ({ embedded = false }) => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  
  console.log('TransferTokens component loaded! Version: 2.0');
  
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

  // Add state for mint functionality
  const [activeTab, setActiveTab] = useState('transfer');
  const [minting, setMinting] = useState(false);
  const [mintResult, setMintResult] = useState(null);
  const [mintStatus, setMintStatus] = useState("");
  const [isDeployer, setIsDeployer] = useState(false);
  const [mintFormData, setMintFormData] = useState({
    mintAmount: '',
    mintRecipient: ''
  });

  // Add new state for enhanced filtering and searching
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTokens, setFilteredTokens] = useState([]);
  const [transferStep, setTransferStep] = useState('source');

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
    console.log('Token selected:', tokenId, 'on chain:', chainId);
    
    // Find the token data
    const selectedToken = userTokens.find(token => token.id === tokenId);
    if (!selectedToken) {
      console.error('Selected token not found in user tokens');
      return;
    }
    
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
    
    if (!selectedToken) {
      setError("Please select a token first");
      return;
    }
    
    if (!formData.sourceChain) {
      setError("Please select a source chain");
      return;
    }
    
    if (!formData.destinationChain) {
      setError("Please select a destination chain");
      return;
    }
    
    if (formData.sourceChain === formData.destinationChain) {
      setError("Source and destination chains must be different");
      return;
    }
    
    try {
      setError(null);
      setTransferring(true);
      
      // Get contract address for the source chain
      const tokenContract = selectedToken.chainInfo.find(
        chain => chain.chain_id === formData.sourceChain || chain.chainId === formData.sourceChain
      );
      
      if (!tokenContract || !tokenContract.contract_address) {
        throw new Error(`Contract address not found for chain ID ${formData.sourceChain}`);
      }
      
      setProcessingStatus("Connecting to wallet...");
      
      // Make sure transfer amount is a valid number
      if (isNaN(parseFloat(formData.transferAmount)) || parseFloat(formData.transferAmount) <= 0) {
        throw new Error("Please enter a valid amount greater than 0");
      }
      
      // Format the amount using the token's decimals
      const decimals = selectedToken.decimals || 18;
      console.log("Using token decimals:", decimals);
      console.log("Input amount:", formData.transferAmount);
      
      // Try/catch just for the parseUnits to provide better error messages
      let formattedAmount;
      try {
        formattedAmount = ethers.parseUnits(formData.transferAmount, decimals).toString();
        console.log('Parsed transfer amount successfully:', formattedAmount);
      } catch (parseError) {
        console.error('Error parsing amount:', parseError);
        throw new Error(`Invalid amount format: ${parseError.message}`);
      }
      
      // Ensure we have valid chain IDs as strings
      const sourceChainId = String(formData.sourceChain);
      const destinationChainId = String(formData.destinationChain);
      
      // Get the contract address, ensuring we clean it for proper format
      const contractAddress = tokenContract.contract_address;
      
      // Make sure the recipient address is properly formatted
      const recipient = formData.recipientAddress && formData.recipientAddress.trim() 
        ? formData.recipientAddress.trim()
        : address;
        
      if (!ethers.isAddress(recipient)) {
        throw new Error("Invalid recipient address format");
      }
      
      console.log('Preparing transfer with params:', {
        sourceChainId,
        destinationChainId,
        contractAddress,
        recipient,
        amount: formattedAmount
      });
      
      // Set detailed status updates for user
      setProcessingStatus("Preparing transaction on ZetaChain. Please approve the transaction in your wallet when prompted.");
      
      // Use direct contract interaction instead of API
      try {
        const result = await executeCrossChainTransfer({
          sourceChain: sourceChainId,
          destinationChain: destinationChainId,
          tokenAddress: contractAddress,
          recipientAddress: recipient,
          amount: formattedAmount
        });
        
        console.log('Transfer result:', result);
        setTransferResult(result);
        setProcessingStatus("Transfer completed successfully!");
        
        // Reset form but keep token and source chain selected
        setFormData({
          ...formData,
          transferAmount: '',
          recipientAddress: ''
        });
      } catch (transferError) {
        console.error('Contract interaction error:', transferError);
        
        // Specific error handling for various contract errors
        if (transferError.message.includes('insufficient funds for gas')) {
          setError("You don't have enough ZETA to pay for gas. Please add more ZETA to your wallet.");
        } else if (transferError.message.includes('Insufficient token balance')) {
          setError("You don't have enough tokens. Please check your balance and try again with a smaller amount.");
        } else if (transferError.message.includes('user rejected transaction')) {
          setError("Transaction was rejected in your wallet.");
        } else if (transferError.message.includes('cannot transfer to same chain') || 
                   transferError.message.includes('Cannot transfer to the same chain')) {
          setError("Source and destination chains must be different. Please select a different destination chain.");
        } else if (transferError.message.includes('No connected contract') || 
                   transferError.message.includes('support cross-chain transfers')) {
          setError(`This token doesn't support transfers to chain ${formData.destinationChain}. Please select a different destination.`);
        } else if (transferError.message.includes('execution reverted')) {
          setError("Transaction reverted on the blockchain. This might be due to contract restrictions or configuration issues.");
        } else {
          // General error handling
          setError(transferError.message);
        }
        
        setProcessingStatus("");
      }
    } catch (error) {
      console.error('Transfer failed:', error);
      setError(error.message);
      setProcessingStatus("");
    } finally {
      setTransferring(false);
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
        
      case 'createdAtDesc':
        // Sort by newest creation date first
        return sortedTokens.sort((a, b) => {
          const aDate = a.created_at ? new Date(a.created_at) : new Date(0);
          const bDate = b.created_at ? new Date(b.created_at) : new Date(0);
          return bDate - aDate;
        });
        
      case 'createdAtAsc':
        // Sort by oldest creation date first
        return sortedTokens.sort((a, b) => {
          const aDate = a.created_at ? new Date(a.created_at) : new Date(0);
          const bDate = b.created_at ? new Date(b.created_at) : new Date(0);
          return aDate - bDate;
        });
        
      default:
        return sortedTokens;
    }
  };
  
  // Handle sort option change
  const handleSortChange = (option) => {
    setSortOption(option);
    const sorted = sortTokens(userTokens, option);
    setUserTokens(sorted);
    
    // Re-apply current filters
    let filtered = [...sorted];
    if (filter === 'owned') {
      filtered = filtered.filter(token => token.isDeployer);
    } else if (filter === 'holdings') {
      filtered = filtered.filter(token => !token.isDeployer);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(token => 
        token.name.toLowerCase().includes(query) || 
        token.symbol.toLowerCase().includes(query)
      );
    }
    
    setFilteredTokens(filtered);
    updateDisplayedTokens(filtered, currentPage, tokensPerPage);
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
    // Don't reset activeTab here, so we remember which tab was active
  };

  // Check if user is the token deployer when token is selected
  useEffect(() => {
    const checkIsDeployer = async () => {
      if (!selectedToken || !formData.sourceChain) return;
      
      try {
        const tokenContract = selectedToken.chainInfo.find(
          chain => chain.chain_id === formData.sourceChain || chain.chainId === formData.sourceChain
        );
        
        if (!tokenContract || !tokenContract.contract_address) return;
        
        // Check if current user is deployer from token data
        const isCreator = selectedToken.deployer_address && 
                          selectedToken.deployer_address.toLowerCase() === address?.toLowerCase();
                          
        if (isCreator) {
          setIsDeployer(true);
          return;
        }
        
        // If not obviously the creator, check on-chain
        const ownerResult = await isTokenOwner({
          chainId: formData.sourceChain,
          tokenAddress: tokenContract.contract_address
        });
        
        setIsDeployer(ownerResult);
      } catch (error) {
        console.error('Error checking token deployer status:', error);
        setIsDeployer(false);
      }
    };
    
    checkIsDeployer();
  }, [selectedToken, formData.sourceChain, address]);
  
  // Handler for mint form changes
  const handleMintChange = (e) => {
    setMintFormData({
      ...mintFormData,
      [e.target.name]: e.target.value
    });
  };
  
  // Handle mint tab selection
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Keep the transfer box open when switching tabs
    setShowTransferBox(true);
  };
  
  // Handler for mint submission
  const handleMintSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedToken) {
      setError("Please select a token first");
      return;
    }
    
    if (!formData.sourceChain) {
      setError("Please select a source chain");
      return;
    }
    
    try {
      setError(null);
      setMinting(true);
      setMintStatus("Preparing to mint tokens...");
      
      // Get contract address for the source chain
      const tokenContract = selectedToken.chainInfo.find(
        chain => chain.chain_id === formData.sourceChain || chain.chainId === formData.sourceChain
      );
      
      if (!tokenContract || !tokenContract.contract_address) {
        throw new Error(`Contract address not found for chain ID ${formData.sourceChain}`);
      }
      
      // Make sure mint amount is a valid number
      if (isNaN(parseFloat(mintFormData.mintAmount)) || parseFloat(mintFormData.mintAmount) <= 0) {
        throw new Error("Please enter a valid amount greater than 0");
      }
      
      // Format the amount using the token's decimals
      const decimals = selectedToken.decimals || 18;
      console.log("Using token decimals for mint:", decimals);
      console.log("Input mint amount:", mintFormData.mintAmount);
      
      // Try/catch just for the parseUnits to provide better error messages
      let formattedAmount;
      try {
        formattedAmount = ethers.parseUnits(mintFormData.mintAmount, decimals).toString();
        console.log('Parsed mint amount successfully:', formattedAmount);
      } catch (parseError) {
        console.error('Error parsing amount:', parseError);
        throw new Error(`Invalid amount format: ${parseError.message}`);
      }
      
      // Get the chain ID as a string
      const chainIdStr = String(formData.sourceChain);
      
      // Get the contract address
      const contractAddress = tokenContract.contract_address;
      
      // Make sure the recipient address is properly formatted
      const recipient = mintFormData.mintRecipient && mintFormData.mintRecipient.trim() 
        ? mintFormData.mintRecipient.trim()
        : address;
        
      if (!ethers.isAddress(recipient)) {
        throw new Error("Invalid recipient address format");
      }
      
      console.log('Preparing mint with params:', {
        chainId: chainIdStr,
        tokenAddress: contractAddress,
        recipientAddress: recipient,
        amount: formattedAmount
      });
      
      // Set detailed status updates for user
      setMintStatus("Preparing mint transaction. Please approve the transaction in your wallet when prompted.");
      
      // Use direct contract interaction for minting
      try {
        const result = await mintTokens({
          chainId: chainIdStr,
          tokenAddress: contractAddress,
          recipientAddress: recipient,
          amount: formattedAmount
        });
        
        console.log('Mint result:', result);
        setMintResult(result);
        setMintStatus("Tokens minted successfully!");
        
        // Reset form
        setMintFormData({
          mintAmount: '',
          mintRecipient: ''
        });
      } catch (mintError) {
        console.error('Contract interaction error during mint:', mintError);
        
        // Specific error handling for various contract errors
        if (mintError.message.includes('insufficient funds for gas')) {
          setError("You don't have enough ZETA to pay for gas. Please add more ZETA to your wallet.");
        } else if (mintError.message.includes('Only the token owner')) {
          setError("Only the token owner can mint new tokens. You don't have permission.");
        } else if (mintError.message.includes('user rejected transaction')) {
          setError("Transaction was rejected in your wallet.");
        } else if (mintError.message.includes('execution reverted')) {
          setError("Transaction reverted on the blockchain. This might be due to contract restrictions or configuration issues.");
        } else {
          // General error handling
          setError(mintError.message);
        }
        
        setMintStatus("");
      }
    } catch (error) {
      console.error('Mint failed:', error);
      setError(error.message);
      setMintStatus("");
    } finally {
      setMinting(false);
    }
  };

  // Add a new effect to handle filtering and searching
  useEffect(() => {
    if (!userTokens || userTokens.length === 0) {
      setFilteredTokens([]);
      return;
    }
    
    // First apply ownership filter
    let filtered = [...userTokens];
    if (filter === 'owned') {
      filtered = filtered.filter(token => token.isDeployer);
    } else if (filter === 'holdings') {
      filtered = filtered.filter(token => !token.isDeployer);
    }
    
    // Then apply search query filter if there's a query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(token => 
        token.name.toLowerCase().includes(query) || 
        token.symbol.toLowerCase().includes(query)
      );
    }
    
    setFilteredTokens(filtered);
    
    // Update displayed tokens based on pagination
    const startIndex = (currentPage - 1) * tokensPerPage;
    const endIndex = startIndex + tokensPerPage;
    setDisplayedTokens(filtered.slice(startIndex, endIndex));
    
    // Update total count for pagination
    setTotalTokenCount(filtered.length);
  }, [userTokens, filter, searchQuery, currentPage, tokensPerPage]);

  // Handle filter change
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1); // Reset to first page when filter changes
  };
  
  // Handle search query change
  const handleSearchChange = (newQuery) => {
    setSearchQuery(newQuery);
    setCurrentPage(1); // Reset to first page when search changes
  };
  
  // Handle token transfer button click
  const handleTokenTransfer = (token) => {
    // Set the selected token in formData
    // (Don't auto-select the source chain)
    setFormData({
      ...formData,
      tokenId: token.id,
      // We're not setting sourceChain here as we want the user to select it
    });
    
    // Display the source chain selection step
    setActiveTab('transfer');
    setShowTransferBox(true);
    setTransferStep('source');
  };
  
  // Handle token mint button click (for token owners)
  const handleTokenMint = (token) => {
    // Set the selected token for minting
    setFormData({
      ...formData,
      tokenId: token.id
    });
    
    // Switch to mint tab
    setActiveTab('mint');
    setShowTransferBox(true);
  };
  
  // Handle quick amount selection
  const handleQuickAmount = (percentage) => {
    if (!selectedToken || !formData.sourceChain) return;
    
    // Get the source chain balance
    const chainInfo = selectedToken.chainInfo.find(info => info.chain_id === formData.sourceChain);
    if (!chainInfo) return;
    
    const balance = chainInfo.balance || '0';
    const sourceBalance = formatTokenBalance(balance, selectedToken.decimals);
    
    // Calculate the quick amount based on percentage
    try {
      const numericBalance = Number(sourceBalance.replace(/,/g, ''));
      const amount = (numericBalance * percentage).toFixed(6);
      
      // Remove trailing zeros
      const formattedAmount = amount.replace(/\.?0+$/, '');
      
      setFormData({
        ...formData,
        transferAmount: formattedAmount
      });
    } catch (error) {
      console.error('Error calculating quick amount:', error);
    }
  };
  
  // Handle transfer panel step navigation
  const handleTransferStepSubmit = (action) => {
    if (action === 'next') {
      if (transferStep === 'source') {
        setTransferStep('amount');
      } else if (transferStep === 'amount') {
        setTransferStep('destination');
      }
    } else if (action === 'submit') {
      // Create a synthetic event to pass to handleSubmit
      const syntheticEvent = { preventDefault: () => {} };
      handleSubmit(syntheticEvent);
    }
  };

  // Separate tokens into owned and held categories
  const ownedTokens = displayedTokens.filter(token => token.isDeployer);
  const heldTokens = displayedTokens.filter(token => !token.isDeployer);

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
              
              {/* Enhanced Filter Controls */}
              <TokenFilterControls 
                filter={filter}
                onFilterChange={handleFilterChange}
                searchQuery={searchQuery}
                onSearchChange={handleSearchChange}
                sortOption={sortOption}
                onSortChange={handleSortChange}
              />
              
              {/* Token lists using the enhanced design */}
              {filter !== 'holdings' && ownedTokens.length > 0 && (
                <TokenSectionContainer title="Tokens You Deployed" isOwner>
                  {ownedTokens.map(token => (
                    <EnhancedTokenCard
                      key={token.id}
                      token={token}
                      isOwner={true}
                      onTransfer={handleTokenTransfer}
                      onMint={handleTokenMint}
                    />
                  ))}
                </TokenSectionContainer>
              )}
              
              {filter !== 'owned' && heldTokens.length > 0 && (
                <TokenSectionContainer title="Tokens You Hold">
                  {heldTokens.map(token => (
                    <EnhancedTokenCard
                      key={token.id}
                      token={token}
                      isOwner={false}
                      onTransfer={handleTokenTransfer}
                    />
                  ))}
                </TokenSectionContainer>
              )}
              
              {displayedTokens.length === 0 && !loading && (
                <p>No tokens match your current filters. Try adjusting your search or filters.</p>
              )}
              
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
            
            {/* Enhanced Transfer Panel */}
            {selectedToken && (
              <>
                {/* Show only when activeTab is 'transfer' */}
                <EnhancedTransferPanel
                  show={showTransferBox && activeTab === 'transfer'}
                  token={selectedToken}
                  activeStep={transferStep}
                  formData={{
                    ...formData,
                    sourceBalance: selectedToken && formData.sourceChain 
                      ? formatTokenBalance(
                          selectedToken.chainInfo.find(i => i.chain_id === formData.sourceChain)?.balance || '0',
                          selectedToken.decimals
                        )
                      : '0'
                  }}
                  onClose={handleCloseTransferBox}
                  onAmountChange={(amount) => setFormData({...formData, transferAmount: amount})}
                  onQuickAmount={handleQuickAmount}
                  onChainSelect={(chainId, type = 'destination') => {
                    if (type === 'source') {
                      setFormData({...formData, sourceChain: chainId});
                    } else {
                      setFormData({...formData, destinationChain: chainId});
                    }
                  }}
                  onRecipientChange={(recipient) => setFormData({...formData, recipientAddress: recipient})}
                  onSubmit={handleTransferStepSubmit}
                  availableChains={
                    selectedToken
                      ? selectedToken.deployedChains
                          .filter(chainId => chainId !== formData.sourceChain)
                          .map(chainId => ({
                            chainId,
                            name: chainNames[chainId] || `Chain ${chainId}`,
                            logo: chainLogos[chainId]
                          }))
                      : []
                  }
                  isTransferring={transferring}
                />
                
                {/* Add the Mint tab content that's shown conditionally */}
                {activeTab === 'mint' && showTransferBox && (
                  <FloatingTransferBox>
                    <CloseButton onClick={handleCloseTransferBox}>×</CloseButton>
                    <TransferBoxTitle>
                      Mint {selectedToken?.name}
                    </TransferBoxTitle>
                    
                    {/* Tabs for switching between transfer and mint */}
                    <TabContainer>
                      <Tab 
                        active={activeTab === 'transfer'} 
                        onClick={() => handleTabChange('transfer')}
                      >
                        Transfer
                      </Tab>
                      <Tab 
                        active={activeTab === 'mint'} 
                        onClick={() => handleTabChange('mint')}
                      >
                        Mint
                      </Tab>
                    </TabContainer>
                    
                    {/* Mint UI */}
                    <FormInput
                      id="mintAmount"
                      label={`Amount to Mint (${selectedToken?.symbol})`}
                      name="mintAmount"
                      type="number"
                      value={mintFormData.mintAmount}
                      onChange={handleMintChange}
                    />
                    
                    <FormInput
                      id="mintRecipient"
                      label="Recipient Address (Optional)"
                      name="mintRecipient"
                      value={mintFormData.mintRecipient}
                      onChange={handleMintChange}
                      helperText="Leave empty to mint to your own address"
                    />
                    
                    {/* Processing Status and Error Display */}
                    {minting && (
                      <StatusMessage type="info">
                        {mintStatus || 'Processing mint...'}
                      </StatusMessage>
                    )}
                    
                    {error && (
                      <StatusMessage type="error">
                        {error}
                      </StatusMessage>
                    )}
                    
                    <ButtonContainer>
                      <MintButton 
                        type="button" 
                        disabled={!mintFormData.mintAmount || minting}
                        onClick={handleMintSubmit}
                      >
                        {minting ? 'Processing...' : 'Mint Token'}
                      </MintButton>
                    </ButtonContainer>
                  </FloatingTransferBox>
                )}
              </>
            )}
          </form>
        </>
      )}
      
      {transferResult && (
        <ResultsBox success={!transferResult.error}>
          <h3>{transferResult.error ? 'Transfer Failed' : 'Transfer Complete'}</h3>
          <p>{transferResult.message}</p>
          {transferResult.txHash && (
            <TxLink 
              href={`https://explorer.athens.zetachain.com/tx/${transferResult.txHash}`} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              View Transaction
            </TxLink>
          )}
          <ResultCloseButton onClick={() => setTransferResult(null)}>Close</ResultCloseButton>
        </ResultsBox>
      )}
      
      {mintResult && (
        <ResultsBox success={!mintResult.error}>
          <h3>{mintResult.error ? 'Mint Failed' : 'Mint Complete'}</h3>
          <p>{mintResult.message}</p>
          {mintResult.txHash && (
            <TxLink 
              href={`https://explorer.athens.zetachain.com/tx/${mintResult.txHash}`} 
              target="_blank" 
              rel="noopener noreferrer"
            >
              View Transaction
            </TxLink>
          )}
          <ResultCloseButton onClick={() => setMintResult(null)}>Close</ResultCloseButton>
        </ResultsBox>
      )}
    </PageContainer>
  );
};

export default TransferTokens; 