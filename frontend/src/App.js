import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { configureChains, createConfig, WagmiConfig, useAccount } from 'wagmi';
import { mainnet, sepolia, bscTestnet, baseSepolia } from 'wagmi/chains';
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
import CreatePage from './pages/Create';
import TransferPage from './pages/Transfer';
import BuyPage from './pages/Buy';
// Import Layout
import Layout from './components/layout/Layout';
// Import API Service
import apiService from './services/apiService';

// Define ZetaChain Testnet (Athens)
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

// Configure Chains
const { chains, publicClient } = configureChains(
  [mainnet, sepolia, bscTestnet, baseSepolia, zetaChainAthens],
  [publicProvider()]
);

// Configure Wallets
const connectors = connectorsForWallets([
  {
    groupName: 'Recommended',
    wallets: [
      metaMaskWallet({ chains }),
      coinbaseWallet({ appName: 'Universal Launcher', chains }),
    ],
  },
]);

// Configure Wagmi Client
const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient
});

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
    <WagmiConfig config={wagmiConfig}>
      <RainbowKitProvider
        theme={darkTheme({
          accentColor: '#3C9DF2',
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
              <Route path="/create" element={<Layout><CreatePage /></Layout>} />
              <Route path="/transfer" element={<Layout><TransferPage /></Layout>} />
              <Route path="/buy" element={<Layout><BuyPage /></Layout>} />
              {/* Add more routes as needed */}
            </Routes>
          </Router>
        </WalletConnector>
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

export default App;
