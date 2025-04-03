import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAccount, useChainId } from 'wagmi';
import TokenTile from '../../components/TokenTile';

// Styled components
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

const NFTCollectionSection = styled.div`
  margin-bottom: 32px;
`;

const CollectionHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
`;

const CollectionImage = styled.img`
  width: 48px;
  height: 48px;
  border-radius: 8px;
  margin-right: 16px;
`;

const CollectionInfo = styled.div`
  flex: 1;
`;

const CollectionName = styled.h3`
  margin-bottom: 4px;
  font-size: 20px;
`;

const CollectionCreator = styled.div`
  font-size: 14px;
  color: var(--text-secondary);
`;

const NFTGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
`;

const SelectedNFTSection = styled.div`
  display: ${props => props.show ? 'block' : 'none'};
`;

const SelectedNFTHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 24px;
  background-color: rgba(26, 26, 28, 0.8);
  padding: 16px;
  border-radius: 12px;
`;

const SelectedNFTInfo = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
`;

const NFTLabel = styled.span`
  font-size: 14px;
  color: var(--text-secondary);
  margin-right: 8px;
`;

const NFTValue = styled.span`
  font-weight: 500;
  margin-right: 16px;
`;

const DestinationLabel = styled.h4`
  margin-bottom: 16px;
  font-size: 16px;
`;

const FormInput = styled.input`
  width: 100%;
  padding: 12px;
  background-color: rgba(42, 42, 45, 0.5);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 16px;
  
  &:focus {
    outline: none;
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 2px rgba(60, 157, 242, 0.1);
  }
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 32px;
`;

const MoveButton = styled.button`
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

const MoveStatus = styled.div`
  margin-top: 24px;
  padding: 16px;
  background-color: ${props => 
    props.status === 'success' ? 'rgba(0, 232, 181, 0.1)' : 
    props.status === 'error' ? 'rgba(255, 82, 82, 0.1)' : 
    'rgba(60, 157, 242, 0.1)'
  };
  border-radius: 8px;
  color: ${props => 
    props.status === 'success' ? 'var(--accent-secondary)' : 
    props.status === 'error' ? 'var(--error)' : 
    'var(--text-primary)'
  };
`;

// Mock Data: NFT Collections
const mockNFTCollections = [
  {
    id: 1,
    name: 'Cosmic Explorers',
    image: 'https://picsum.photos/id/1/300/200',
    creator: '0x1234...5678',
    items: [
      { 
        id: 101, 
        tokenId: 1, 
        name: 'Cosmic Explorer #1', 
        image: 'https://picsum.photos/id/100/300/300',
        chain: { 
          id: 7001, 
          name: 'ZetaChain Athens',
          logo: 'https://cryptologos.cc/logos/zetachain-zeta-logo.png' 
        } 
      },
      { 
        id: 102, 
        tokenId: 2, 
        name: 'Cosmic Explorer #2', 
        image: 'https://picsum.photos/id/101/300/300',
        chain: { 
          id: 1, 
          name: 'Ethereum',
          logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png' 
        } 
      },
      { 
        id: 103, 
        tokenId: 3, 
        name: 'Cosmic Explorer #3', 
        image: 'https://picsum.photos/id/102/300/300',
        chain: { 
          id: 56, 
          name: 'BNB Smart Chain',
          logo: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' 
        } 
      }
    ]
  },
  {
    id: 2,
    name: 'Digital Dreamscapes',
    image: 'https://picsum.photos/id/2/300/200',
    creator: '0x9876...5432',
    items: [
      { 
        id: 201, 
        tokenId: 1, 
        name: 'Digital Dreamscape #1', 
        image: 'https://picsum.photos/id/200/300/300',
        chain: { 
          id: 7001, 
          name: 'ZetaChain Athens',
          logo: 'https://cryptologos.cc/logos/zetachain-zeta-logo.png' 
        } 
      },
      { 
        id: 202, 
        tokenId: 2, 
        name: 'Digital Dreamscape #2', 
        image: 'https://picsum.photos/id/201/300/300',
        chain: { 
          id: 56, 
          name: 'BNB Smart Chain', 
          logo: 'https://cryptologos.cc/logos/bnb-bnb-logo.png' 
        } 
      }
    ]
  }
];

// Mock Data: Available Chains
const mockChains = [
  {
    id: 7001,
    name: 'ZetaChain Athens',
    logo: 'https://cryptologos.cc/logos/zetachain-zeta-logo.png'
  },
  {
    id: 1,
    name: 'Ethereum',
    logo: 'https://cryptologos.cc/logos/ethereum-eth-logo.png'
  },
  {
    id: 56,
    name: 'BNB Smart Chain',
    logo: 'https://cryptologos.cc/logos/bnb-bnb-logo.png'
  },
  {
    id: 8453,
    name: 'Base',
    logo: 'https://cryptologos.cc/logos/base-logo.png'
  }
];

/**
 * MoveNFT Page Component
 * 
 * Handles moving NFTs between different chains using Universal NFT contracts
 */
const MoveNFTPage = ({ embedded = false }) => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  
  const [collections, setCollections] = useState([]);
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [destinationChain, setDestinationChain] = useState(null);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [moveStatus, setMoveStatus] = useState(null);
  const [moveMessage, setMoveMessage] = useState('');
  
  // Load NFT collections
  useEffect(() => {
    if (isConnected) {
      // In a real app, you would fetch the user's NFTs from an API
      // const fetchNFTs = async () => {
      //   const response = await apiService.getUserNFTs(address);
      //   setCollections(response);
      // };
      // fetchNFTs();
      
      // Using mock data for now
      setCollections(mockNFTCollections);
    }
  }, [isConnected, address]);
  
  useEffect(() => {
    // Reset status when NFT or destination changes
    setMoveStatus(null);
    setMoveMessage('');
  }, [selectedNFT, destinationChain]);
  
  // Handle NFT selection
  const handleNFTSelect = (nft) => {
    setSelectedNFT(nft);
  };
  
  // Handle destination chain selection
  const handleDestinationChainSelect = (chain) => {
    setDestinationChain(chain);
  };
  
  // Handle recipient address input
  const handleRecipientChange = (e) => {
    setRecipientAddress(e.target.value);
  };
  
  // Handle move
  const handleMove = async () => {
    try {
      setMoveStatus('processing');
      setMoveMessage('Initiating NFT move...');
      
      // In a real app, you would call your API to process the move
      // const response = await apiService.moveNFT({
      //   nftId: selectedNFT.id,
      //   sourceChain: selectedNFT.chain.id,
      //   destinationChain: destinationChain.id,
      //   recipient: recipientAddress
      // });
      
      // Simulate the move process
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMoveMessage('Burning NFT on source chain...');
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      setMoveMessage('Minting NFT on destination chain...');
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMoveStatus('success');
      setMoveMessage('NFT successfully moved!');
      
    } catch (error) {
      console.error('Move error:', error);
      setMoveStatus('error');
      setMoveMessage('Error moving NFT. Please try again.');
    }
  };
  
  // Check if move button should be enabled
  const isMoveEnabled = () => {
    return (
      selectedNFT &&
      destinationChain &&
      destinationChain.id !== selectedNFT.chain.id &&
      recipientAddress.length > 0
    );
  };
  
  return (
    <PageContainer embedded={embedded.toString()}>
      <PageTitle embedded={embedded.toString()}>Move Universal NFTs</PageTitle>
      
      <FormContainer>
        <SectionTitle>Your NFT Collections</SectionTitle>
        
        {collections.length === 0 ? (
          <p>You don't have any Universal NFTs yet.</p>
        ) : (
          collections.map(collection => (
            <NFTCollectionSection key={collection.id}>
              <CollectionHeader>
                <CollectionImage src={collection.image} alt={collection.name} />
                <CollectionInfo>
                  <CollectionName>{collection.name}</CollectionName>
                  <CollectionCreator>Creator: {collection.creator}</CollectionCreator>
                </CollectionInfo>
              </CollectionHeader>
              
              <NFTGrid>
                {collection.items.map(nft => (
                  <TokenTile
                    key={nft.id}
                    token={nft}
                    selected={selectedNFT?.id === nft.id}
                    onClick={() => handleNFTSelect(nft)}
                  />
                ))}
              </NFTGrid>
            </NFTCollectionSection>
          ))
        )}
      </FormContainer>
      
      <SelectedNFTSection show={selectedNFT !== null}>
        <SectionTitle>Move NFT</SectionTitle>
        
        {selectedNFT && (
          <>
            <SelectedNFTHeader>
              <SelectedNFTInfo>
                <NFTLabel>Selected NFT:</NFTLabel>
                <NFTValue>{selectedNFT.name}</NFTValue>
                <NFTLabel>Current Chain:</NFTLabel>
                <NFTValue>{selectedNFT.chain.name}</NFTValue>
              </SelectedNFTInfo>
            </SelectedNFTHeader>
            
            <FormContainer>
              <FormRow>
                <FormGroup>
                  <DestinationLabel>Destination Chain</DestinationLabel>
                  <select
                    value={destinationChain?.id || ''}
                    onChange={(e) => {
                      const chain = collections[0].items[0].chain;
                      handleDestinationChainSelect(chain);
                    }}
                  >
                    <option value="">Select Chain</option>
                    <option value="1">Ethereum</option>
                    <option value="137">Polygon</option>
                    <option value="56">BSC</option>
                  </select>
                </FormGroup>
                
                <FormGroup>
                  <DestinationLabel>Recipient Address</DestinationLabel>
                  <FormInput
                    type="text"
                    value={recipientAddress}
                    onChange={handleRecipientChange}
                    placeholder="Enter recipient address"
                  />
                </FormGroup>
              </FormRow>
              
              <ButtonContainer>
                <MoveButton
                  onClick={handleMove}
                  disabled={!isMoveEnabled() || moveStatus === 'processing'}
                >
                  {moveStatus === 'processing' ? 'Processing...' : 'Move NFT'}
                </MoveButton>
              </ButtonContainer>
              
              {moveStatus && (
                <MoveStatus status={moveStatus}>
                  <p>{moveMessage}</p>
                </MoveStatus>
              )}
            </FormContainer>
          </>
        )}
      </SelectedNFTSection>
    </PageContainer>
  );
};

export default MoveNFTPage; 