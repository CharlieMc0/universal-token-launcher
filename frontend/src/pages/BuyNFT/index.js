import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useAccount, useBalance, useChainId } from 'wagmi';

// Styled Components
const PageContainer = styled.div`
  max-width: ${props => props.embedded ? '100%' : '1000px'};
  margin: 0 auto;
  padding: ${props => props.embedded ? '0' : '40px 20px'};
`;

const PageTitle = styled.h1`
  margin-bottom: 32px;
  text-align: center;
  display: ${props => props.embedded ? 'none' : 'block'};
`;

const Section = styled.div`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 32px;
  margin-bottom: 32px;
`;

const SectionTitle = styled.h2`
  font-size: 24px;
  margin-bottom: 24px;
`;

const CollectionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 24px;
  margin-bottom: 24px;
`;

const CollectionCard = styled.div`
  background-color: rgba(26, 26, 28, 0.8);
  border-radius: 12px;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
  border: 2px solid ${props => props.selected ? 'var(--accent-primary)' : 'transparent'};
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
  }
`;

const CollectionImage = styled.img`
  width: 100%;
  height: 180px;
  object-fit: cover;
`;

const CollectionInfo = styled.div`
  padding: 16px;
`;

const CollectionName = styled.h3`
  margin-bottom: 8px;
  font-size: 18px;
`;

const CollectionDescription = styled.p`
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
`;

const CollectionDetails = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 14px;
`;

const PurchasePanel = styled.div`
  display: ${props => props.show ? 'block' : 'none'};
`;

const Divider = styled.hr`
  border: none;
  border-top: 1px solid var(--border);
  margin: 24px 0;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
`;

const FormLabel = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
`;

const Select = styled.select`
  width: 100%;
  padding: 12px;
  background-color: rgba(42, 42, 45, 0.5);
  color: var(--text-primary);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 16px;
  appearance: none;
  
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

const Button = styled.button`
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

const AssetOption = styled.div`
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid var(--border);
  margin-bottom: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  background-color: ${props => props.selected ? 'rgba(60, 157, 242, 0.1)' : 'transparent'};
  border-color: ${props => props.selected ? 'var(--accent-primary)' : 'var(--border)'};
  
  &:hover {
    background-color: rgba(60, 157, 242, 0.05);
  }
`;

const AssetIcon = styled.img`
  width: 24px;
  height: 24px;
  margin-right: 12px;
`;

const AssetInfo = styled.div`
  flex: 1;
`;

const AssetName = styled.div`
  font-weight: 500;
`;

const AssetBalance = styled.div`
  font-size: 12px;
  color: var(--text-secondary);
`;

const ChainOption = styled.div`
  display: flex;
  align-items: center;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid var(--border);
  margin-bottom: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease;
  background-color: ${props => props.selected ? 'rgba(60, 157, 242, 0.1)' : 'transparent'};
  border-color: ${props => props.selected ? 'var(--accent-primary)' : 'var(--border)'};
  
  &:hover {
    background-color: rgba(60, 157, 242, 0.05);
  }
`;

const ChainIcon = styled.img`
  width: 24px;
  height: 24px;
  margin-right: 12px;
`;

const ChainName = styled.div`
  font-weight: 500;
`;

const PurchaseSummary = styled.div`
  background-color: rgba(26, 26, 28, 0.8);
  border-radius: 12px;
  padding: 24px;
  margin-top: 24px;
`;

const SummaryTitle = styled.h3`
  margin-bottom: 16px;
  font-weight: 600;
`;

const SummaryItem = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const SummaryLabel = styled.div`
  color: var(--text-secondary);
`;

const SummaryValue = styled.div`
  font-weight: 500;
`;

const TotalRow = styled(SummaryItem)`
  border-top: 1px solid var(--border);
  padding-top: 16px;
  margin-top: 16px;
  font-weight: 600;
`;

// Mock Data
const mockCollections = [
  {
    id: 1,
    name: 'Cosmic Explorers',
    description: 'A collection of space explorers traversing the multiverse.',
    image: 'https://picsum.photos/id/1/300/200',
    price: 0.5,
    remainingSupply: 50,
    totalSupply: 100,
    creator: '0x1234...5678'
  },
  {
    id: 2,
    name: 'Digital Dreamscapes',
    description: 'Surreal landscapes from digital dreams and neural networks.',
    image: 'https://picsum.photos/id/2/300/200',
    price: 0.75,
    remainingSupply: 25,
    totalSupply: 50,
    creator: '0x9876...5432'
  },
  {
    id: 3,
    name: 'Crypto Creatures',
    description: 'Mythical beasts born from the blockchain.',
    image: 'https://picsum.photos/id/3/300/200',
    price: 1.2,
    remainingSupply: 75,
    totalSupply: 100,
    creator: '0x5555...8888'
  }
];

const mockPaymentAssets = [
  {
    id: 'zeta',
    name: 'ZETA',
    symbol: 'ZETA',
    icon: 'https://cryptologos.cc/logos/zetachain-zeta-logo.png',
    balance: 10.5
  },
  {
    id: 'btc',
    name: 'Bitcoin',
    symbol: 'BTC',
    icon: 'https://cryptologos.cc/logos/bitcoin-btc-logo.png',
    balance: 0.025
  },
  {
    id: 'eth',
    name: 'Ethereum',
    symbol: 'ETH',
    icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
    balance: 0.15
  }
];

const mockChains = [
  {
    id: 7001,
    name: 'ZetaChain Athens',
    icon: 'https://cryptologos.cc/logos/zetachain-zeta-logo.png'
  },
  {
    id: 1,
    name: 'Ethereum',
    icon: 'https://cryptologos.cc/logos/ethereum-eth-logo.png'
  },
  {
    id: 56,
    name: 'BNB Smart Chain',
    icon: 'https://cryptologos.cc/logos/bnb-bnb-logo.png'
  },
  {
    id: 8453,
    name: 'Base',
    icon: 'https://cryptologos.cc/logos/base-logo.png'
  }
];

const BuyNFTPage = ({ embedded = false }) => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [selectedPaymentAsset, setSelectedPaymentAsset] = useState(null);
  const [selectedMintChain, setSelectedMintChain] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [purchaseStatus, setPurchaseStatus] = useState(null);
  
  // Handle collection selection
  const handleCollectionSelect = (collection) => {
    setSelectedCollection(collection);
    setSelectedPaymentAsset(null);
    setSelectedMintChain(null);
    setQuantity(1);
  };
  
  // Handle payment asset selection
  const handlePaymentAssetSelect = (asset) => {
    setSelectedPaymentAsset(asset);
  };
  
  // Handle mint chain selection
  const handleMintChainSelect = (chain) => {
    setSelectedMintChain(chain);
  };
  
  // Handle quantity change
  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value);
    if (value > 0 && selectedCollection && value <= selectedCollection.remainingSupply) {
      setQuantity(value);
    }
  };
  
  // Calculate total price
  const calculateTotalPrice = () => {
    if (!selectedCollection) return 0;
    return selectedCollection.price * quantity;
  };
  
  // Handle purchase
  const handlePurchase = async () => {
    try {
      setPurchaseStatus('processing');
      
      // In a real app, this would call your API to process the purchase
      // const response = await apiService.purchaseNFT({
      //   collectionId: selectedCollection.id,
      //   paymentAssetId: selectedPaymentAsset.id,
      //   mintChainId: selectedMintChain.id,
      //   quantity,
      //   buyer: address
      // });
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setPurchaseStatus('success');
    } catch (error) {
      console.error('Purchase error:', error);
      setPurchaseStatus('error');
    }
  };
  
  // Check if purchase button should be enabled
  const isPurchaseEnabled = () => {
    return (
      isConnected &&
      selectedCollection &&
      selectedPaymentAsset &&
      selectedMintChain &&
      quantity > 0 &&
      quantity <= selectedCollection.remainingSupply &&
      selectedPaymentAsset.balance >= calculateTotalPrice()
    );
  };
  
  // Render purchase status
  const renderPurchaseStatus = () => {
    switch (purchaseStatus) {
      case 'processing':
        return <p>Processing your purchase...</p>;
      case 'success':
        return (
          <div>
            <h3>Purchase Successful!</h3>
            <p>You have successfully purchased {quantity} NFT(s) from {selectedCollection.name}.</p>
            <p>The NFT(s) will be minted on {selectedMintChain.name} and will be available in your wallet soon.</p>
            <ButtonContainer>
              <Button onClick={() => setPurchaseStatus(null)}>Make Another Purchase</Button>
            </ButtonContainer>
          </div>
        );
      case 'error':
        return (
          <div>
            <h3>Purchase Failed</h3>
            <p>There was an error processing your purchase. Please try again.</p>
            <ButtonContainer>
              <Button onClick={() => setPurchaseStatus(null)}>Try Again</Button>
            </ButtonContainer>
          </div>
        );
      default:
        return null;
    }
  };
  
  return (
    <PageContainer embedded={embedded.toString()}>
      <PageTitle embedded={embedded.toString()}>Buy Universal NFTs</PageTitle>
      
      {purchaseStatus ? (
        <Section>
          <SectionTitle>Purchase Status</SectionTitle>
          {renderPurchaseStatus()}
        </Section>
      ) : (
        <>
          <Section>
            <SectionTitle>Available Collections</SectionTitle>
            <CollectionsGrid>
              {mockCollections.map(collection => (
                <CollectionCard 
                  key={collection.id}
                  onClick={() => handleCollectionSelect(collection)}
                  selected={selectedCollection?.id === collection.id}
                >
                  <CollectionImage src={collection.image} alt={collection.name} />
                  <CollectionInfo>
                    <CollectionName>{collection.name}</CollectionName>
                    <CollectionDescription>{collection.description}</CollectionDescription>
                    <CollectionDetails>
                      <div>Price: {collection.price} ZETA</div>
                      <div>{collection.remainingSupply}/{collection.totalSupply}</div>
                    </CollectionDetails>
                  </CollectionInfo>
                </CollectionCard>
              ))}
            </CollectionsGrid>
          </Section>
          
          <PurchasePanel show={selectedCollection !== null}>
            <Section>
              <SectionTitle>Purchase NFT</SectionTitle>
              
              {selectedCollection && (
                <>
                  <div>
                    <h3>Selected Collection: {selectedCollection.name}</h3>
                    <p>Price per NFT: {selectedCollection.price} ZETA</p>
                    <p>Available: {selectedCollection.remainingSupply}/{selectedCollection.totalSupply}</p>
                  </div>
                  
                  <Divider />
                  
                  <FormGrid>
                    <FormGroup>
                      <FormLabel>Select Payment Asset</FormLabel>
                      {mockPaymentAssets.map(asset => (
                        <AssetOption 
                          key={asset.id}
                          onClick={() => handlePaymentAssetSelect(asset)}
                          selected={selectedPaymentAsset?.id === asset.id}
                        >
                          <AssetIcon src={asset.icon} alt={asset.name} />
                          <AssetInfo>
                            <AssetName>{asset.name} ({asset.symbol})</AssetName>
                            <AssetBalance>Balance: {asset.balance}</AssetBalance>
                          </AssetInfo>
                        </AssetOption>
                      ))}
                    </FormGroup>
                    
                    <FormGroup>
                      <FormLabel>Select Mint Chain</FormLabel>
                      {mockChains.map(chain => (
                        <ChainOption 
                          key={chain.id}
                          onClick={() => handleMintChainSelect(chain)}
                          selected={selectedMintChain?.id === chain.id}
                        >
                          <ChainIcon src={chain.icon} alt={chain.name} />
                          <ChainName>{chain.name}</ChainName>
                        </ChainOption>
                      ))}
                    </FormGroup>
                  </FormGrid>
                  
                  <FormGroup>
                    <FormLabel>Quantity</FormLabel>
                    <Select value={quantity} onChange={handleQuantityChange}>
                      {[...Array(selectedCollection.remainingSupply)].map((_, i) => (
                        <option key={i+1} value={i+1}>{i+1}</option>
                      ))}
                    </Select>
                  </FormGroup>
                  
                  {selectedPaymentAsset && selectedMintChain && (
                    <PurchaseSummary>
                      <SummaryTitle>Purchase Summary</SummaryTitle>
                      <SummaryItem>
                        <SummaryLabel>Collection</SummaryLabel>
                        <SummaryValue>{selectedCollection.name}</SummaryValue>
                      </SummaryItem>
                      <SummaryItem>
                        <SummaryLabel>Quantity</SummaryLabel>
                        <SummaryValue>{quantity}</SummaryValue>
                      </SummaryItem>
                      <SummaryItem>
                        <SummaryLabel>Price per NFT</SummaryLabel>
                        <SummaryValue>{selectedCollection.price} {selectedPaymentAsset.symbol}</SummaryValue>
                      </SummaryItem>
                      <SummaryItem>
                        <SummaryLabel>Payment Asset</SummaryLabel>
                        <SummaryValue>{selectedPaymentAsset.name}</SummaryValue>
                      </SummaryItem>
                      <SummaryItem>
                        <SummaryLabel>Mint Chain</SummaryLabel>
                        <SummaryValue>{selectedMintChain.name}</SummaryValue>
                      </SummaryItem>
                      <TotalRow>
                        <SummaryLabel>Total</SummaryLabel>
                        <SummaryValue>{calculateTotalPrice()} {selectedPaymentAsset.symbol}</SummaryValue>
                      </TotalRow>
                    </PurchaseSummary>
                  )}
                  
                  <ButtonContainer>
                    <Button 
                      onClick={handlePurchase}
                      disabled={!isPurchaseEnabled()}
                    >
                      Purchase NFT
                    </Button>
                  </ButtonContainer>
                </>
              )}
            </Section>
          </PurchasePanel>
        </>
      )}
    </PageContainer>
  );
};

export default BuyNFTPage; 