import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAccount } from 'wagmi';
import FormInput from '../../components/FormInput';
import TokenTile, { chainLogos, chainNames } from '../../components/TokenTile';
import apiService from '../../services/apiService';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
`;

const Title = styled.h1`
  font-size: 2rem;
  margin-bottom: 20px;
`;

const Subtitle = styled.p`
  font-size: 1rem;
  margin-bottom: 30px;
  color: #555;
`;

const SubmitButton = styled.button`
  background-color: #3498db;
  border: none;
  padding: 12px 24px;
  font-size: 1rem;
  color: #fff;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 20px;

  &:hover {
    background-color: #2980b9;
  }
  
  &:disabled {
    background-color: #95a5a6;
    cursor: not-allowed;
  }
`;

const FormSection = styled.div`
  margin-bottom: 30px;
`;

const SectionTitle = styled.h3`
  font-size: 1.2rem;
  margin-bottom: 15px;
`;

const TokenSection = styled.div`
  margin-bottom: 40px;
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
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 40px;
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

const TransferResultCard = styled.div`
  margin-top: 30px;
  padding: 20px;
  border-radius: 8px;
  background-color: #e8f7f3;
  border: 1px solid #2ecc71;
`;

const TransactionHash = styled.a`
  display: block;
  margin-top: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #3498db;
  text-decoration: underline;
`;

const ResultTitle = styled.h4`
  margin-bottom: 15px;
  color: #2ecc71;
`;

const TransferTokenPage = () => {
  const { address, isConnected } = useAccount();
  
  const [userTokens, setUserTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [transferResult, setTransferResult] = useState(null);
  
  const [formData, setFormData] = useState({
    tokenId: '',
    sourceChain: '',
    destinationChain: [],
    transferAmount: '',
    recipientAddress: ''
  });

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
      destinationChain: []
    });
  };

  const handleDestinationSelect = (chainId) => {
    setFormData({
      ...formData,
      destinationChain: formData.destinationChain.includes(chainId)
        ? formData.destinationChain.filter(id => id !== chainId)
        : [...formData.destinationChain, chainId]
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setTransferring(true);
      setTransferResult(null);
      
      const result = await apiService.transferTokens({
        tokenId: formData.tokenId,
        sourceChain: formData.sourceChain,
        destinationChain: formData.destinationChain,
        transferAmount: formData.transferAmount,
        recipientAddress: formData.recipientAddress || address
      });
      
      console.log('Transfer result:', result);
      setTransferResult(result);
      
      // Reset form 
      setFormData({
        ...formData,
        transferAmount: '',
        recipientAddress: ''
      });
    } catch (error) {
      console.error('Transfer failed:', error);
      alert(`Transfer failed: ${error.message}`);
    } finally {
      setTransferring(false);
    }
  };

  // Fetch user's tokens
  useEffect(() => {
    const fetchUserTokens = async () => {
      if (isConnected && address) {
        try {
          setLoading(true);
          const tokens = await apiService.getUserTokens(address);
          setUserTokens(tokens);
        } catch (error) {
          console.error('Error fetching user tokens:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchUserTokens();
  }, [isConnected, address]);

  const selectedToken = formData.tokenId ? 
    userTokens.find(token => token.id === formData.tokenId) : null;

  // Get available destination chains
  const getAvailableDestinationChains = () => {
    if (!selectedToken) return [];
    
    // Return all supported chains except the source chain
    return supportedChains.filter(chain => 
      chain.id !== formData.sourceChain
    );
  };

  return (
    <Container>
      <Title>Transfer Your Universal Tokens</Title>
      <Subtitle>
        Move your tokens between any supported blockchains through ZetaChain.
      </Subtitle>
      
      {loading ? (
        <p>Loading your tokens...</p>
      ) : userTokens.length === 0 ? (
        <p>You don't have any universal tokens to transfer. Launch a new token first!</p>
      ) : (
        <>
          <form onSubmit={handleSubmit}>
            <FormSection>
              <SectionTitle>Your Universal Tokens</SectionTitle>
              
              {/* Show all tokens grouped by name */}
              {userTokens.map(token => (
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
                    {token.deployedChains.map(chainId => (
                      <TokenTile
                        key={`${token.id}-${chainId}`}
                        token={token}
                        chainId={chainId}
                        balance={token.balances[chainId] || 0}
                        selected={formData.tokenId === token.id && formData.sourceChain === chainId}
                        onClick={handleTokenSelect}
                      />
                    ))}
                  </TokenGrid>
                </TokenSection>
              ))}
            </FormSection>

            {/* Show destination selection if a token is selected */}
            {formData.tokenId && (
              <FormSection>
                <SectionTitle>Select Destination Chains</SectionTitle>
                <SelectedTokenSection>
                  <SelectedTokenHeader>
                    <SelectedTokenInfo>
                      <TokenIcon 
                        src={selectedToken.iconUrl || '/chain-logos/zetachain.svg'} 
                        alt={`${selectedToken.symbol} icon`}
                      />
                      <div>
                        <SelectedTokenTitle>
                          {selectedToken.name}
                          <SelectedTokenSymbol>{selectedToken.symbol}</SelectedTokenSymbol>
                        </SelectedTokenTitle>
                        <SelectedChainInfo>
                          <SelectedChainLogo 
                            src={chainLogos[formData.sourceChain]} 
                            alt={`${chainNames[formData.sourceChain]} logo`}
                          />
                          <SelectedChainName>{chainNames[formData.sourceChain]}</SelectedChainName>
                          <SelectedBalance>
                            {selectedToken.balances[formData.sourceChain] || 0} {selectedToken.symbol}
                          </SelectedBalance>
                        </SelectedChainInfo>
                      </div>
                    </SelectedTokenInfo>
                  </SelectedTokenHeader>
                  
                  <TokenGrid>
                    {getAvailableDestinationChains().map(chain => (
                      <TokenTile
                        key={`${selectedToken.id}-${chain.id}`}
                        token={selectedToken}
                        chainId={chain.id}
                        balance={selectedToken.balances[chain.id] || 0}
                        selected={formData.destinationChain.includes(chain.id)}
                        disabled={chain.disabled}
                        onClick={handleDestinationSelect}
                      />
                    ))}
                  </TokenGrid>
                </SelectedTokenSection>
              </FormSection>
            )}
            
            {formData.tokenId && formData.destinationChain.length > 0 && (
              <FormSection>
                <SectionTitle>Transfer Details</SectionTitle>
                <FormInput
                  id="transferAmount"
                  label={`Amount to Transfer (${selectedToken.symbol})`}
                  name="transferAmount"
                  type="number"
                  value={formData.transferAmount}
                  onChange={handleChange}
                  helperText={`Available: ${selectedToken.balances[formData.sourceChain] || 0} ${selectedToken.symbol}`}
                />
                
                <FormInput
                  id="recipientAddress"
                  label="Recipient Address (Optional)"
                  name="recipientAddress"
                  value={formData.recipientAddress}
                  onChange={handleChange}
                  helperText="Leave empty to send to your own address on destination chain"
                />
              </FormSection>
            )}
            
            <SubmitButton 
              type="submit" 
              disabled={
                transferring || 
                !formData.tokenId || 
                formData.destinationChain.length === 0 || 
                !formData.transferAmount
              }
            >
              {transferring ? 'Processing...' : 'Transfer Tokens'}
            </SubmitButton>
          </form>
          
          {transferResult && (
            <TransferResultCard>
              <ResultTitle>Transfer Initiated Successfully!</ResultTitle>
              <p>
                Transferring {transferResult.amount} tokens from {
                  selectedToken.name
                } on {
                  selectedToken.deployedChains.find(c => c === transferResult.sourceChain)
                } to {
                  transferResult.destinationChains.map(
                    chainId => selectedToken.deployedChains.find(c => c === chainId)
                  ).join(', ')
                }
              </p>
              <p>Transaction hash: 
                <TransactionHash 
                  href={`https://athens.explorer.zetachain.com/cc/tx/${transferResult.transactionHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {transferResult.transactionHash}
                </TransactionHash>
              </p>
            </TransferResultCard>
          )}
        </>
      )}
    </Container>
  );
};

export default TransferTokenPage; 