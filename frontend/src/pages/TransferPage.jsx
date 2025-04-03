import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTokenDetails, initiateTokenTransfer } from '../services/apiService';
import Button from '../components/Button';
import { formatTokenBalance, getChainName } from '../utils/tokenUtils';
import { 
  estimateCrossChainGas, 
  CHAIN_IDS 
} from '../utils/contracts';
import { 
  isTokenOwner, 
  mintTokens, 
  executeTokenTransfer,
  executeCrossChainTransfer 
} from '../utils/contractInteractions';
import { ethers } from 'ethers';
import './Transfer/TransferPage.css';

/**
 * Transfer Page Component
 * 
 * Handles cross-chain token transfers for Universal Tokens.
 * Allows selecting source and destination chains, specifying amount and recipient.
 * For token owners, also provides minting functionality.
 */
const TransferPage = ({ walletAddress }) => {
  const { tokenId } = useParams();
  const navigate = useNavigate();
  
  // Token and form state
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sourceChain, setSourceChain] = useState(null);
  const [destChain, setDestChain] = useState(null);
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [gasEstimate, setGasEstimate] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState(null);
  
  // Transfer type state (cross-chain, regular, mint)
  const [transferType, setTransferType] = useState('cross-chain');
  
  // Mint specific state
  const [mintAmount, setMintAmount] = useState('');
  const [mintRecipient, setMintRecipient] = useState('');
  const [isDeployer, setIsDeployer] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [mintTxHash, setMintTxHash] = useState(null);
  
  // Regular transfer state
  const [regularRecipient, setRegularRecipient] = useState('');
  const [regularAmount, setRegularAmount] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferTxHash, setTransferTxHash] = useState(null);
  
  // Fetch token details and check if user is deployer
  useEffect(() => {
    const fetchToken = async () => {
      if (!tokenId) return;
      
      try {
        setLoading(true);
        const tokenData = await getTokenDetails(tokenId);
        setToken(tokenData);
        
        // Set default source chain (the one with highest balance)
        if (tokenData.chainInfo && tokenData.chainInfo.length > 0) {
          // Sort chains by balance
          const sortedChains = [...tokenData.chainInfo].sort((a, b) => {
            const aBalance = a.balance ? ethers.toBigInt(a.balance) : ethers.toBigInt(0);
            const bBalance = b.balance ? ethers.toBigInt(b.balance) : ethers.toBigInt(0);
            return bBalance > aBalance ? 1 : -1;
          });
          
          // Set source chain to the one with highest balance
          setSourceChain(sortedChains[0]);
          
          // Set default destination chain (different from source)
          if (sortedChains.length > 1) {
            setDestChain(sortedChains[1]);
          }
          
          // Check if the user is the deployer for any of the chains
          if (sortedChains.length > 0 && walletAddress) {
            const chainToCheck = sortedChains[0];
            const isOwner = await isTokenOwner({
              chainId: chainToCheck.chainId,
              tokenAddress: chainToCheck.contractAddress
            });
            setIsDeployer(isOwner);
            
            // Default the mint recipient to the wallet address
            if (isOwner) {
              setMintRecipient(walletAddress);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching token:', err);
        setError('Failed to load token details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchToken();
  }, [tokenId, walletAddress]);
  
  // Update gas estimate when source or destination chain changes
  useEffect(() => {
    if (sourceChain && destChain) {
      const gas = estimateCrossChainGas(
        sourceChain.chainId, 
        destChain.chainId
      );
      setGasEstimate(gas);
    }
  }, [sourceChain, destChain]);
  
  // Handle source chain selection
  const handleSourceChainChange = (e) => {
    const chainId = e.target.value;
    const chain = token.chainInfo.find(c => c.chainId === chainId);
    setSourceChain(chain);
    
    // Reset destination chain if it's the same as source
    if (destChain && destChain.chainId === chainId) {
      setDestChain(null);
    }
  };
  
  // Handle destination chain selection
  const handleDestChainChange = (e) => {
    const chainId = e.target.value;
    const chain = token.chainInfo.find(c => c.chainId === chainId);
    setDestChain(chain);
  };
  
  // Handle amount input
  const handleAmountChange = (e) => {
    setAmount(e.target.value);
  };
  
  // Handle recipient input
  const handleRecipientChange = (e) => {
    setRecipient(e.target.value);
  };
  
  // Handle max amount button
  const handleMaxAmount = () => {
    if (sourceChain && sourceChain.balance) {
      setAmount(formatTokenBalance(sourceChain.balance, token.decimals));
    }
  };
  
  // Handle mint recipient input
  const handleMintRecipientChange = (e) => {
    setMintRecipient(e.target.value);
  };
  
  // Handle mint amount input
  const handleMintAmountChange = (e) => {
    setMintAmount(e.target.value);
  };
  
  // Handle regular transfer recipient input
  const handleRegularRecipientChange = (e) => {
    setRegularRecipient(e.target.value);
  };
  
  // Handle regular transfer amount input
  const handleRegularAmountChange = (e) => {
    setRegularAmount(e.target.value);
  };
  
  // Handle regular transfer max amount button
  const handleRegularMaxAmount = () => {
    if (sourceChain && sourceChain.balance) {
      setRegularAmount(formatTokenBalance(sourceChain.balance, token.decimals));
    }
  };
  
  // Handle transfer type selection
  const handleTransferTypeChange = (e) => {
    setTransferType(e.target.value);
  };
  
  // Handle mint submission
  const handleMintSubmit = async (e) => {
    e.preventDefault();
    
    if (!walletAddress || !sourceChain || !mintRecipient || !mintAmount) {
      setError('Please fill in all required fields for minting');
      return;
    }
    
    try {
      setIsMinting(true);
      setError(null);
      
      // Convert amount to wei format
      const mintAmountWei = ethers.parseUnits(mintAmount, token.decimals).toString();
      
      // Execute mint transaction
      const result = await mintTokens({
        chainId: sourceChain.chainId,
        tokenAddress: sourceChain.contractAddress,
        recipientAddress: mintRecipient,
        amount: mintAmountWei
      });
      
      setMintTxHash(result.transactionHash);
      
      // Reset form after successful mint
      setMintAmount('');
    } catch (err) {
      console.error('Error minting tokens:', err);
      setError(`Failed to mint tokens: ${err.message}`);
    } finally {
      setIsMinting(false);
    }
  };
  
  // Handle regular transfer submission
  const handleRegularTransferSubmit = async (e) => {
    e.preventDefault();
    
    if (!walletAddress || !sourceChain || !regularRecipient || !regularAmount) {
      setError('Please fill in all required fields for transfer');
      return;
    }
    
    try {
      setIsTransferring(true);
      setError(null);
      
      // Convert amount to wei format
      const transferAmountWei = ethers.parseUnits(regularAmount, token.decimals).toString();
      
      // Execute transfer transaction
      const result = await executeTokenTransfer({
        chainId: sourceChain.chainId,
        tokenAddress: sourceChain.contractAddress,
        recipientAddress: regularRecipient,
        amount: transferAmountWei
      });
      
      setTransferTxHash(result.transactionHash);
      
      // Reset form after successful transfer
      setRegularAmount('');
    } catch (err) {
      console.error('Error transferring tokens:', err);
      setError(`Failed to transfer tokens: ${err.message}`);
    } finally {
      setIsTransferring(false);
    }
  };
  
  // Handle cross-chain transfer submission
  const handleCrossChainSubmit = async (e) => {
    e.preventDefault();
    
    if (!walletAddress || !sourceChain || !destChain || !amount || !recipient) {
      setError('Please fill in all required fields');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Convert amount to wei format
      const transferAmountWei = ethers.parseUnits(amount, token.decimals).toString();
      
      // Execute cross-chain transfer transaction
      const result = await executeCrossChainTransfer({
        sourceChain: sourceChain.chainId,
        destinationChain: destChain.chainId,
        tokenAddress: sourceChain.contractAddress,
        recipientAddress: recipient,
        amount: transferAmountWei
      });
      
      setTxHash(result.transactionHash);
    } catch (err) {
      console.error('Error initiating transfer:', err);
      setError(`Failed to initiate transfer: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="transfer-loading">
        <div className="spinner"></div>
        <p>Loading token details...</p>
      </div>
    );
  }
  
  // Error state
  if (error && !token) {
    return (
      <div className="transfer-error">
        <h2>Error Loading Token</h2>
        <p>{error}</p>
        <Button variant="secondary" onClick={() => navigate('/tokens')}>
          Back to Tokens
        </Button>
      </div>
    );
  }
  
  // Success state after cross-chain transfer
  if (txHash) {
    return (
      <div className="transfer-success">
        <h2>Cross-Chain Transfer Initiated!</h2>
        <p>Your cross-chain transfer has been initiated successfully.</p>
        <div className="tx-details">
          <p>Transaction Hash: <a href={`https://explorer.zetachain.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer">{txHash.slice(0, 10)}...{txHash.slice(-8)}</a></p>
          <p>From: {sourceChain.name}</p>
          <p>To: {destChain.name}</p>
          <p>Amount: {amount} {token.symbol}</p>
          <p>Recipient: {recipient}</p>
        </div>
        <Button variant="primary" onClick={() => {
          setTxHash(null);
          // Reload token data to get updated balances
          window.location.reload();
        }}>
          New Transfer
        </Button>
        <Button variant="secondary" onClick={() => navigate('/tokens')}>
          Back to Tokens
        </Button>
      </div>
    );
  }
  
  // Success state after regular transfer
  if (transferTxHash) {
    return (
      <div className="transfer-success">
        <h2>Transfer Successful!</h2>
        <p>Your token transfer has been completed successfully.</p>
        <div className="tx-details">
          <p>Transaction Hash: <a 
            href={sourceChain.explorerUrl ? `${sourceChain.explorerUrl}/tx/${transferTxHash}` : '#'} 
            target="_blank" 
            rel="noopener noreferrer"
          >
            {transferTxHash.slice(0, 10)}...{transferTxHash.slice(-8)}
          </a></p>
          <p>Chain: {sourceChain.name}</p>
          <p>Amount: {regularAmount} {token.symbol}</p>
          <p>Recipient: {regularRecipient}</p>
        </div>
        <Button variant="primary" onClick={() => {
          setTransferTxHash(null);
          // Reload token data to get updated balances
          window.location.reload();
        }}>
          New Transfer
        </Button>
        <Button variant="secondary" onClick={() => navigate('/tokens')}>
          Back to Tokens
        </Button>
      </div>
    );
  }
  
  // Success state after minting
  if (mintTxHash) {
    return (
      <div className="transfer-success">
        <h2>Tokens Minted Successfully!</h2>
        <p>Your token minting transaction has been completed.</p>
        <div className="tx-details">
          <p>Transaction Hash: <a 
            href={sourceChain.explorerUrl ? `${sourceChain.explorerUrl}/tx/${mintTxHash}` : '#'} 
            target="_blank" 
            rel="noopener noreferrer"
          >
            {mintTxHash.slice(0, 10)}...{mintTxHash.slice(-8)}
          </a></p>
          <p>Chain: {sourceChain.name}</p>
          <p>Amount: {mintAmount} {token.symbol}</p>
          <p>Recipient: {mintRecipient}</p>
        </div>
        <Button variant="primary" onClick={() => {
          setMintTxHash(null);
          // Reload token data to get updated balances
          window.location.reload();
        }}>
          Mint More Tokens
        </Button>
        <Button variant="secondary" onClick={() => navigate('/tokens')}>
          Back to Tokens
        </Button>
      </div>
    );
  }
  
  // Main transfer form
  return (
    <div className="transfer-page">
      <h1>Transfer {token?.name} ({token?.symbol})</h1>
      
      {error && <div className="error-message">{error}</div>}
      
      {/* Transfer Type Selection */}
      <div className="transfer-type-selection">
        <div className="transfer-type-header">
          <h3>Select Transfer Type</h3>
        </div>
        <div className="transfer-type-options">
          <label className={`transfer-type-option ${transferType === 'regular' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="transferType"
              value="regular"
              checked={transferType === 'regular'}
              onChange={handleTransferTypeChange}
            />
            <span className="transfer-type-label">Regular Transfer</span>
            <span className="transfer-type-description">Send tokens to another address on the same chain</span>
          </label>
          
          <label className={`transfer-type-option ${transferType === 'cross-chain' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="transferType"
              value="cross-chain"
              checked={transferType === 'cross-chain'}
              onChange={handleTransferTypeChange}
            />
            <span className="transfer-type-label">Cross-Chain Transfer</span>
            <span className="transfer-type-description">Send tokens to another chain</span>
          </label>
          
          {isDeployer && (
            <label className={`transfer-type-option ${transferType === 'mint' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="transferType"
                value="mint"
                checked={transferType === 'mint'}
                onChange={handleTransferTypeChange}
              />
              <span className="transfer-type-label">Mint Tokens</span>
              <span className="transfer-type-description">Create new tokens (deployer only)</span>
            </label>
          )}
        </div>
      </div>
      
      {/* Regular Transfer Form */}
      {transferType === 'regular' && (
        <form onSubmit={handleRegularTransferSubmit} className="transfer-form">
          <h3>Regular Transfer</h3>
          
          {/* Source Chain */}
          <div className="form-group">
            <label htmlFor="regularSourceChain">Chain:</label>
            <select 
              id="regularSourceChain" 
              value={sourceChain?.chainId || ''}
              onChange={handleSourceChainChange}
              required
            >
              <option value="">Select chain</option>
              {token?.chainInfo
                .filter(chain => chain.balance && ethers.toBigInt(chain.balance) > 0)
                .map(chain => (
                  <option key={chain.chainId} value={chain.chainId}>
                    {chain.name} ({formatTokenBalance(chain.balance, token.decimals)} {token.symbol})
                  </option>
                ))
              }
            </select>
          </div>
          
          {/* Recipient */}
          <div className="form-group">
            <label htmlFor="regularRecipient">Recipient Address:</label>
            <input 
              id="regularRecipient" 
              type="text" 
              value={regularRecipient}
              onChange={handleRegularRecipientChange}
              placeholder="0x..."
              required
            />
          </div>
          
          {/* Amount */}
          <div className="form-group">
            <label htmlFor="regularAmount">Amount:</label>
            <div className="amount-input-container">
              <input 
                id="regularAmount" 
                type="text" 
                value={regularAmount}
                onChange={handleRegularAmountChange}
                placeholder="0.0"
                required
              />
              <Button 
                type="button" 
                onClick={handleRegularMaxAmount}
              >
                MAX
              </Button>
            </div>
            <div className="amount-detail">
              {sourceChain && (
                <span>Balance: {formatTokenBalance(sourceChain.balance, token.decimals)} {token.symbol}</span>
              )}
            </div>
          </div>
          
          {/* Submit Button */}
          <Button 
            type="submit" 
            disabled={isTransferring || !sourceChain || !regularRecipient || !regularAmount}
          >
            {isTransferring ? 'Transferring...' : 'Transfer Tokens'}
          </Button>
        </form>
      )}
      
      {/* Cross-Chain Transfer Form */}
      {transferType === 'cross-chain' && (
        <form onSubmit={handleCrossChainSubmit} className="transfer-form">
          <h3>Cross-Chain Transfer</h3>
          
          {/* Source Chain */}
          <div className="form-group">
            <label htmlFor="sourceChain">From Chain:</label>
            <select 
              id="sourceChain" 
              value={sourceChain?.chainId || ''}
              onChange={handleSourceChainChange}
              required
            >
              <option value="">Select source chain</option>
              {token?.chainInfo
                .filter(chain => chain.balance && ethers.toBigInt(chain.balance) > 0)
                .map(chain => (
                  <option key={chain.chainId} value={chain.chainId}>
                    {chain.name} ({formatTokenBalance(chain.balance, token.decimals)} {token.symbol})
                  </option>
                ))
              }
            </select>
          </div>
          
          {/* Destination Chain */}
          <div className="form-group">
            <label htmlFor="destChain">To Chain:</label>
            <select 
              id="destChain" 
              value={destChain?.chainId || ''}
              onChange={handleDestChainChange}
              required
            >
              <option value="">Select destination chain</option>
              {token?.chainInfo
                .filter(chain => !sourceChain || chain.chainId !== sourceChain.chainId)
                .map(chain => (
                  <option key={chain.chainId} value={chain.chainId}>
                    {chain.name}
                  </option>
                ))
              }
            </select>
          </div>
          
          {/* Amount */}
          <div className="form-group">
            <label htmlFor="amount">Amount:</label>
            <div className="amount-input-container">
              <input 
                id="amount" 
                type="text" 
                value={amount}
                onChange={handleAmountChange}
                placeholder="0.0"
                required
              />
              <Button 
                type="button" 
                onClick={handleMaxAmount}
              >
                MAX
              </Button>
            </div>
            <div className="amount-detail">
              {sourceChain && (
                <span>Balance: {formatTokenBalance(sourceChain.balance, token.decimals)} {token.symbol}</span>
              )}
            </div>
          </div>
          
          {/* Recipient */}
          <div className="form-group">
            <label htmlFor="recipient">Recipient Address:</label>
            <input 
              id="recipient" 
              type="text" 
              value={recipient}
              onChange={handleRecipientChange}
              placeholder="0x..."
              required
            />
          </div>
          
          {/* Gas Estimate */}
          {gasEstimate && sourceChain && destChain && (
            <div className="gas-estimate">
              <p>Estimated Gas: {gasEstimate} gas units</p>
            </div>
          )}
          
          {/* Submit Button */}
          <Button 
            type="submit" 
            disabled={isSubmitting || !sourceChain || !destChain || !amount || !recipient}
          >
            {isSubmitting ? 'Processing...' : 'Transfer Tokens'}
          </Button>
        </form>
      )}
      
      {/* Mint Form (Only for token deployers) */}
      {transferType === 'mint' && isDeployer && (
        <form onSubmit={handleMintSubmit} className="transfer-form">
          <h3>Mint New Tokens</h3>
          <div className="deployer-notice">
            <p>As the token deployer, you can mint new tokens to any address.</p>
          </div>
          
          {/* Chain */}
          <div className="form-group">
            <label htmlFor="mintChain">Chain:</label>
            <select 
              id="mintChain" 
              value={sourceChain?.chainId || ''}
              onChange={handleSourceChainChange}
              required
            >
              <option value="">Select chain</option>
              {token?.chainInfo.map(chain => (
                <option key={chain.chainId} value={chain.chainId}>
                  {chain.name}
                </option>
              ))}
            </select>
          </div>
          
          {/* Recipient */}
          <div className="form-group">
            <label htmlFor="mintRecipient">Recipient Address:</label>
            <input 
              id="mintRecipient" 
              type="text" 
              value={mintRecipient}
              onChange={handleMintRecipientChange}
              placeholder="0x..."
              required
            />
          </div>
          
          {/* Amount */}
          <div className="form-group">
            <label htmlFor="mintAmount">Amount to Mint:</label>
            <input 
              id="mintAmount" 
              type="text" 
              value={mintAmount}
              onChange={handleMintAmountChange}
              placeholder="0.0"
              required
            />
            <div className="amount-detail">
              <span>Token Decimals: {token.decimals}</span>
            </div>
          </div>
          
          {/* Submit Button */}
          <Button 
            type="submit" 
            disabled={isMinting || !sourceChain || !mintRecipient || !mintAmount}
          >
            {isMinting ? 'Minting...' : 'Mint Tokens'}
          </Button>
        </form>
      )}
      
      {/* Display message if not a deployer but mint was selected */}
      {transferType === 'mint' && !isDeployer && (
        <div className="not-deployer-message">
          <p>Only the token deployer can mint new tokens. Please select a different transfer type.</p>
          <Button variant="secondary" onClick={() => setTransferType('regular')}>
            Regular Transfer
          </Button>
        </div>
      )}
      
      <div className="back-button-container">
        <Button variant="secondary" onClick={() => navigate('/tokens')}>
          Back to Tokens
        </Button>
      </div>
    </div>
  );
};

export default TransferPage; 