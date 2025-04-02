import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTokenDetails, initiateTokenTransfer } from '../services/apiService';
import { formatTokenBalance, getChainName } from '../utils/tokenUtils';
import { estimateCrossChainGas } from '../utils/contracts';
import { ethers } from 'ethers';

/**
 * Transfer Page Component
 * 
 * Handles cross-chain token transfers for Universal Tokens.
 * Allows selecting source and destination chains, specifying amount and recipient.
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
  
  // Fetch token details
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
        }
      } catch (err) {
        console.error('Error fetching token:', err);
        setError('Failed to load token details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchToken();
  }, [tokenId]);
  
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
  
  // Handle transfer submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!walletAddress || !sourceChain || !destChain || !amount || !recipient) {
      setError('Please fill in all required fields');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Prepare transfer data
      const transferData = {
        tokenId: token.id,
        sourceChainId: sourceChain.chainId,
        destChainId: destChain.chainId,
        amount,
        recipient,
        sender: walletAddress
      };
      
      // Initiate transfer
      const result = await initiateTokenTransfer(transferData);
      setTxHash(result.txHash);
      
      // Success! Show confirmation
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
        <button onClick={() => navigate('/tokens')}>
          Back to Tokens
        </button>
      </div>
    );
  }
  
  // Success state after transfer
  if (txHash) {
    return (
      <div className="transfer-success">
        <h2>Transfer Initiated!</h2>
        <p>Your cross-chain transfer has been initiated successfully.</p>
        <div className="tx-details">
          <p>Transaction Hash: <a href={`https://explorer.zetachain.com/tx/${txHash}`} target="_blank" rel="noopener noreferrer">{txHash.slice(0, 10)}...{txHash.slice(-8)}</a></p>
          <p>From: {sourceChain.chainName}</p>
          <p>To: {destChain.chainName}</p>
          <p>Amount: {amount} {token.symbol}</p>
          <p>Recipient: {recipient}</p>
        </div>
        <button onClick={() => navigate('/tokens')}>
          Back to Tokens
        </button>
      </div>
    );
  }
  
  // Main transfer form
  return (
    <div className="transfer-page">
      <h1>Transfer {token?.name} ({token?.symbol})</h1>
      
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit} className="transfer-form">
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
              .filter(chain => chain.balance && chain.balance !== '0')
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
            <button 
              type="button" 
              className="max-button"
              onClick={handleMaxAmount}
            >
              MAX
            </button>
          </div>
          {sourceChain && (
            <div className="balance-display">
              Balance: {formatTokenBalance(sourceChain.balance, token?.decimals)} {token?.symbol}
            </div>
          )}
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
          <div className="recipient-help">
            <small>Address to receive tokens on the destination chain</small>
          </div>
        </div>
        
        {/* Gas Estimate */}
        {gasEstimate && (
          <div className="gas-estimate">
            <p>Estimated Gas: ~{gasEstimate}</p>
          </div>
        )}
        
        {/* Submit Button */}
        <div className="form-actions">
          <button 
            type="button" 
            className="cancel-button"
            onClick={() => navigate('/tokens')}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="submit-button"
            disabled={isSubmitting || !sourceChain || !destChain || !amount || !recipient}
          >
            {isSubmitting ? 'Initiating Transfer...' : 'Transfer'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TransferPage; 