import React, { useState, useEffect } from 'react';
import { getUserTokens } from '../services/apiService';
import TokenCard from './TokenCard';
import { useNavigate } from 'react-router-dom';

/**
 * Tokens List Component
 * 
 * Displays a list of Universal Tokens held by the user with their connected contracts
 * across all chains. Each token is displayed in a TokenCard component.
 * 
 * @param {Object} props - Component props
 * @param {string} props.walletAddress - User's wallet address
 */
const TokensList = ({ walletAddress }) => {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  
  // Fetch user tokens when component mounts or wallet address changes
  useEffect(() => {
    const fetchTokens = async () => {
      if (!walletAddress) {
        setTokens([]);
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const userTokens = await getUserTokens(walletAddress);
        setTokens(userTokens);
        setError(null);
      } catch (err) {
        console.error('Error fetching tokens:', err);
        setError('Failed to load tokens. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTokens();
  }, [walletAddress]);
  
  // Handle token selection for transfer
  const handleSelectToken = (token) => {
    navigate(`/transfer/${token.id}`);
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="tokens-loading">
        <div className="spinner"></div>
        <p>Loading your Universal Tokens...</p>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="tokens-error">
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          Try Again
        </button>
      </div>
    );
  }
  
  // Empty state
  if (!tokens || tokens.length === 0) {
    return (
      <div className="tokens-empty">
        <h2>No Universal Tokens Found</h2>
        <p>You don't have any Universal Tokens yet.</p>
        <button onClick={() => navigate('/make')}>
          Create a New Token
        </button>
      </div>
    );
  }
  
  // Render tokens
  return (
    <div className="tokens-list">
      <h2>Your Universal Tokens</h2>
      <p className="tokens-list-subtitle">
        These tokens can be transferred across multiple chains
      </p>
      
      <div className="tokens-grid">
        {tokens.map(token => (
          <TokenCard 
            key={token.id} 
            token={token} 
            onSelect={handleSelectToken}
          />
        ))}
      </div>
    </div>
  );
};

export default TokensList; 