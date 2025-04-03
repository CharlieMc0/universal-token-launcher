# Network Switcher Implementation Plan

## Overview

The Universal Token Launcher currently only supports testnet networks. This implementation plan outlines how to add a toggle switch in the top right corner that allows users to switch between testnet and mainnet networks. The toggle will:

1. When **Testnet** is selected, only show testnet networks in the UI
2. When **Mainnet** is selected, only show non-testnet (mainnet) networks in the UI
3. When **Mainnet** is selected, ensure the wallet network selection only shows supported mainnet networks

## Implementation Steps

### 1. Create a Global Network Mode Context

First, we need to create a React context to manage the network mode state globally across the application:

```jsx
// src/contexts/NetworkModeContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';

// Create the context
const NetworkModeContext = createContext();

// Create a provider component
export const NetworkModeProvider = ({ children }) => {
  const [networkMode, setNetworkMode] = useState('testnet'); // Default to 'testnet'
  
  // Function to toggle between testnet and mainnet
  const toggleNetworkMode = () => {
    setNetworkMode(prevMode => prevMode === 'testnet' ? 'mainnet' : 'testnet');
  };
  
  // Save preference to localStorage when changed
  useEffect(() => {
    localStorage.setItem('networkMode', networkMode);
  }, [networkMode]);
  
  // Load preference from localStorage on initial render
  useEffect(() => {
    const savedMode = localStorage.getItem('networkMode');
    if (savedMode) {
      setNetworkMode(savedMode);
    }
  }, []);
  
  return (
    <NetworkModeContext.Provider value={{ networkMode, toggleNetworkMode }}>
      {children}
    </NetworkModeContext.Provider>
  );
};

// Custom hook to use the context
export const useNetworkMode = () => useContext(NetworkModeContext);
```

### 2. Create the Toggle Switch Component

Next, we'll create a styled toggle switch component:

```jsx
// src/components/NetworkModeToggle.jsx
import React from 'react';
import styled from 'styled-components';
import { useNetworkMode } from '../contexts/NetworkModeContext';

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  margin-right: 16px;
`;

const ToggleLabel = styled.span`
  font-size: 14px;
  margin-right: 8px;
  color: var(--text-secondary);
`;

const ToggleSwitch = styled.div`
  position: relative;
  width: 60px;
  height: 28px;
  background: ${props => 
    props.$active ? 'linear-gradient(135deg, #4A9FFF 0%, #A269FF 100%)' : 'var(--bg-secondary)'};
  border-radius: 14px;
  cursor: pointer;
  transition: background-color 0.3s ease;
`;

const ToggleKnob = styled.div`
  position: absolute;
  top: 3px;
  left: ${props => props.$active ? '33px' : '3px'};
  width: 22px;
  height: 22px;
  background-color: white;
  border-radius: 50%;
  transition: left 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
`;

const NetworkModeText = styled.span`
  font-size: 12px;
  font-weight: 500;
  position: absolute;
  top: 6px;
  color: white;
  ${props => props.$mainnet ? 'right: 5px;' : 'left: 5px;'}
  opacity: ${props => props.$active ? 1 : 0.7};
  transition: opacity 0.3s ease;
`;

const NetworkModeToggle = () => {
  const { networkMode, toggleNetworkMode } = useNetworkMode();
  const isMainnet = networkMode === 'mainnet';
  
  return (
    <ToggleContainer>
      <ToggleLabel>Network:</ToggleLabel>
      <ToggleSwitch onClick={toggleNetworkMode} $active={isMainnet}>
        <NetworkModeText $active={!isMainnet} $mainnet={false}>Test</NetworkModeText>
        <NetworkModeText $active={isMainnet} $mainnet={true}>Main</NetworkModeText>
        <ToggleKnob $active={isMainnet} />
      </ToggleSwitch>
    </ToggleContainer>
  );
};

export default NetworkModeToggle;
```

### 3. Modify Layout Component to Include the Toggle

Add the toggle switch to the header in the Layout component:

```jsx
// src/components/layout/Layout.jsx
import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import styled from 'styled-components';
import NetworkModeToggle from '../NetworkModeToggle';

// ... existing code ...

const Header = styled.header`
  // ... existing styles ...
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const HeaderControls = styled.div`
  display: flex;
  align-items: center;
`;

const Layout = ({ children }) => {
  return (
    <PageContainer>
      <Header>
        <Logo to="/">Universal Token Launcher</Logo>
        <HeaderControls>
          <NetworkModeToggle />
          <ConnectButton />
        </HeaderControls>
      </Header>
      {/* ... rest of the layout ... */}
    </PageContainer>
  );
};
```

### 4. Update API Service to Filter Chains Based on Network Mode

Modify the `getSupportedChains` function in `apiService.js` to filter chains based on the current network mode:

```jsx
// src/services/apiService.js
import { useNetworkMode } from '../contexts/NetworkModeContext';

// ... existing code ...

export const getSupportedChains = async (networkMode = 'testnet') => {
  try {
    // ... existing code to fetch chains ...
    
    // Filter chains based on network mode
    const filteredChains = chains.filter(chain => {
      // Check the is_testnet (or testnet) field and match to the current network mode
      const isTestnet = chain.is_testnet || chain.testnet || false;
      return networkMode === 'testnet' ? isTestnet : !isTestnet;
    });
    
    return filteredChains;
    
  } catch (error) {
    console.error('Error in getSupportedChains:', error);
    
    // Return appropriate fallback chains based on network mode
    if (networkMode === 'testnet') {
      return [
        {
          chain_id: "7001",
          name: "ZetaChain Testnet",
          enabled: true,
          is_testnet: true
        },
        {
          chain_id: "11155111",
          name: "Sepolia Testnet",
          enabled: true,
          is_testnet: true
        }
      ];
    } else {
      return [
        {
          chain_id: "7000",
          name: "ZetaChain",
          enabled: true,
          is_testnet: false
        },
        {
          chain_id: "1",
          name: "Ethereum Mainnet",
          enabled: true,
          is_testnet: false
        }
      ];
    }
  }
};
```

### 5. Update the App.js to Configure Wallet Chains Based on Network Mode

Modify `App.js` to include the NetworkModeProvider and configure the wallet chains based on the network mode:

```jsx
// src/App.js
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { configureChains, createConfig, WagmiConfig, useAccount } from 'wagmi';
import { mainnet, sepolia, bscTestnet, bsc, base, baseSepolia } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import {
  RainbowKitProvider,
  connectorsForWallets,
  darkTheme
} from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  coinbaseWallet,
} from '@rainbow-me/rainbowkit/wallets';
import '@rainbow-me/rainbowkit/styles.css';
import './App.css';

// Import pages and components
import HomePage from './pages/Home';
import MakePage from './pages/Make';
import MovePage from './pages/Move';
import Layout from './components/layout/Layout';
import apiService from './services/apiService';
import { NetworkModeProvider, useNetworkMode } from './contexts/NetworkModeContext';

// Define ZetaChain Networks
const zetaChainAthens = {
  id: 7001,
  name: 'ZetaChain Athens',
  network: 'zetachain-athens',
  nativeCurrency: {
    decimals: 18,
    name: 'ZETA',
    symbol: 'ZETA',
  },
  rpcUrls: {
    public: { http: ['https://zetachain-athens.g.allthatnode.com/archive/evm'] },
    default: { http: ['https://zetachain-athens.g.allthatnode.com/archive/evm'] },
  },
  blockExplorers: {
    default: { name: 'ZetaScan', url: 'https://explorer.zetachain.com' },
  },
  testnet: true,
};

const zetaChainMainnet = {
  id: 7000,
  name: 'ZetaChain',
  network: 'zetachain',
  nativeCurrency: {
    decimals: 18,
    name: 'ZETA',
    symbol: 'ZETA',
  },
  rpcUrls: {
    public: { http: ['https://zetachain.g.allthatnode.com/archive/evm'] },
    default: { http: ['https://zetachain.g.allthatnode.com/archive/evm'] },
  },
  blockExplorers: {
    default: { name: 'ZetaScan', url: 'https://explorer.zetachain.com' },
  },
  testnet: false,
};

// Group chains by network type
const testnetChains = [sepolia, bscTestnet, baseSepolia, zetaChainAthens];
const mainnetChains = [mainnet, bsc, base, zetaChainMainnet];

// Network-aware application wrapper
function NetworkAwareApp() {
  const { networkMode } = useNetworkMode();
  const [wagmiConfig, setWagmiConfig] = useState(null);
  const [chains, setChains] = useState([]);
  
  // Effect to reconfigure chains when network mode changes
  useEffect(() => {
    const selectedChains = networkMode === 'testnet' ? testnetChains : mainnetChains;
    
    // Configure chains
    const { chains, publicClient } = configureChains(
      selectedChains,
      [publicProvider()]
    );
    
    setChains(chains);
    
    // Configure wallets
    const connectors = connectorsForWallets([
      {
        groupName: 'Recommended',
        wallets: [
          metaMaskWallet({ chains }),
          coinbaseWallet({ appName: 'Universal Launcher', chains }),
        ],
      },
    ]);
    
    // Configure Wagmi client
    const config = createConfig({
      autoConnect: true,
      connectors,
      publicClient
    });
    
    setWagmiConfig(config);
  }, [networkMode]);
  
  // Wait until config is ready
  if (!wagmiConfig) {
    return <div>Loading...</div>;
  }
  
  return (
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider
        theme={darkTheme({
          accentColor: '#4A9FFF',
          accentColorForeground: 'white',
          borderRadius: 'medium',
          fontStack: 'system',
        })}
        chains={chains}
      >
        <WalletConnector>
          <Router>
            <Routes>
              <Route path="/" element={<Layout><HomePage /></Layout>} />
              <Route path="/make" element={<Layout><MakePage /></Layout>} />
              <Route path="/move" element={<Layout><MovePage /></Layout>} />
              
              {/* Legacy routes with redirects */}
              <Route path="/create" element={<Navigate to="/make" replace />} />
              <Route path="/transfer" element={<Navigate to="/move" replace />} />
              
              {/* Catch-all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Router>
        </WalletConnector>
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

// Wallet Connector component to set address in apiService
function WalletConnector({ children }) {
  const { address, isConnected } = useAccount();
  
  useEffect(() => {
    if (isConnected && address) {
      // Set the wallet address in the API service
      apiService.setWalletAddress(address);
    } else {
      apiService.setWalletAddress(null);
    }
  }, [address, isConnected]);
  
  return children;
}

function App() {
  return (
    <NetworkModeProvider>
      <NetworkAwareApp />
    </NetworkModeProvider>
  );
}

export default App;
```

### 6. Update Pages to Pass Network Mode to API Calls

Update the relevant pages (Launch, LaunchNFT, Move, etc.) to pass the current network mode to the API calls:

```jsx
// In src/pages/Launch/index.js and other relevant pages

// Add this near the top of the component
const { networkMode } = useNetworkMode();

// Then modify the chain fetching code
useEffect(() => {
  const fetchSupportedChains = async () => {
    try {
      const chains = await apiService.getSupportedChains(networkMode);
      // Rest of the code to process chains...
    } catch (error) {
      console.error('Error fetching supported chains:', error);
    }
  };

  fetchSupportedChains();
}, [networkMode]); // Add networkMode as a dependency
```

### 7. Handle Chain Selection in ChainSelector Component

Update the ChainSelector component to reflect the appropriate chains based on network mode:

```jsx
// In the ChainSelector component or where it's used

// If used directly in components, make sure to pass filtered options:
<ChainSelector
  label="Select Chains"
  options={chainOptions.filter(chain => 
    networkMode === 'testnet' 
      ? (chain.testnet || chain.value === '7001') // Include ZetaChain testnet
      : (!chain.testnet || chain.value === '7000') // Include ZetaChain mainnet
  )}
  value={formData.selectedChains}
  onChange={handleChange}
  name="selectedChains"
  error={errors.selectedChains}
/>
```

## Additional Considerations

### 1. Network Switching Logic

When the user toggles from testnet to mainnet (or vice versa), we need to handle switching the wallet network appropriately:

```jsx
// Add to NetworkModeContext.js
const switchNetwork = async (newMode) => {
  try {
    // If wallet is connected, try to switch networks
    if (isConnected) {
      const targetChainId = newMode === 'testnet' ? 7001 : 7000; // ZetaChain testnet or mainnet
      await switchNetwork({ chainId: targetChainId });
    }
  } catch (error) {
    console.error('Failed to switch network:', error);
  }
};
```

### 2. UI Feedback When Switching

Provide clear UI feedback when switching network modes:

```jsx
// In NetworkModeToggle.jsx
const [isSwitching, setIsSwitching] = useState(false);

const handleToggle = async () => {
  setIsSwitching(true);
  try {
    await toggleNetworkMode();
  } finally {
    setIsSwitching(false);
  }
};

// Add a loading indicator to the toggle when switching
{isSwitching && <LoadingIndicator />}
```

### 3. Persistent Mode Selection

Save the network mode preference in localStorage to persist between sessions:

```jsx
// Already implemented in the NetworkModeContext
```

### 4. Error Handling

Add appropriate error handling for cases where a mainnet network is not yet available:

```jsx
// In relevant deployment pages
if (networkMode === 'mainnet' && !isMainnetEnabled) {
  return (
    <ErrorMessage>
      Mainnet deployment is coming soon. Please switch to testnet mode for now.
    </ErrorMessage>
  );
}
```

## Implementation Order

For a smooth implementation, follow this order:

1. Create NetworkModeContext
2. Create NetworkModeToggle component
3. Update App.js with the provider and chainId handling
4. Modify Layout to include the toggle
5. Update API service chain filtering
6. Update page components to use network mode
7. Add error handling and UI feedback
8. Test thoroughly with both network modes

## Conclusion

This implementation will provide a seamless way for users to switch between testnet and mainnet networks. The toggle in the top right corner will control which networks are shown in the UI and ensure that the wallet connection is configured appropriately.

The design follows the existing UI aesthetic with a gradient toggle for mainnet mode, clear labeling, and persistent user preference. 