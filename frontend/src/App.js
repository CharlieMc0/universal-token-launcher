import React, { useState, useEffect } from 'react';
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

// Import pages
import HomePage from './pages/Home';
import MakePage from './pages/Make';
import MovePage from './pages/Move';
// Import Layout
import Layout from './components/layout/Layout';
// Import API Service
import apiService from './services/apiService';
// Import NetworkModeProvider
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

// Network-aware application wrapper
function NetworkAwareApp() {
  const { networkMode } = useNetworkMode();
  const [networkChains, setNetworkChains] = useState([]);
  
  // Effect to configure chains when network mode changes
  useEffect(() => {
    console.log(`Configuring chains for ${networkMode} mode`);
    const selectedChains = networkMode === 'testnet' ? testnetChains : mainnetChains;
    setNetworkChains(selectedChains);
  }, [networkMode]);
  
  return (
    <RainbowKitProvider
      theme={darkTheme({
        accentColor: '#4A9FFF',
        accentColorForeground: 'white',
        borderRadius: 'medium',
        fontStack: 'system',
      })}
      chains={networkChains}
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
  );
}

function App() {
  // Configure chains
  const { chains, publicClient } = configureChains(
    [...testnetChains, ...mainnetChains], // Include all chains initially
    [publicProvider()]
  );
  
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
  const wagmiConfig = createConfig({
    autoConnect: true,
    connectors,
    publicClient
  });

  return (
    <WagmiConfig config={wagmiConfig}>
      <NetworkModeProvider>
        <NetworkAwareApp />
      </NetworkModeProvider>
    </WagmiConfig>
  );
}

export default App;
