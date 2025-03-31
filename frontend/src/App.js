import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { configureChains, createConfig, WagmiConfig } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';
import { publicProvider } from 'wagmi/providers/public';
import {
  RainbowKitProvider,
  connectorsForWallets,
  darkTheme
} from '@rainbow-me/rainbowkit';
import {
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
} from '@rainbow-me/rainbowkit/wallets';
import '@rainbow-me/rainbowkit/styles.css';
import './App.css';

// Import pages
import HomePage from './pages/Home';
// Import Layout
import Layout from './components/layout/Layout';

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

// Get WalletConnect Project ID from environment variables
const projectId = process.env.REACT_APP_WALLET_CONNECT_PROJECT_ID || 'YOUR_WALLET_CONNECT_PROJECT_ID';

// Configure Chains
const { chains, publicClient } = configureChains(
  [mainnet, sepolia, zetaChainAthens],
  [publicProvider()]
);

// Configure Wallets
const connectors = connectorsForWallets([
  {
    groupName: 'Recommended',
    wallets: [
      metaMaskWallet({ projectId, chains }),
      coinbaseWallet({ appName: 'Universal Token Launcher', chains }),
      walletConnectWallet({ projectId, chains }),
    ],
  },
]);

// Configure Wagmi Client
const wagmiConfig = createConfig({
  autoConnect: true,
  connectors,
  publicClient
});

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
        <Router>
          <Routes>
            <Route path="/" element={<Layout><HomePage /></Layout>} />
            {/* Add more routes as needed */}
          </Routes>
        </Router>
      </RainbowKitProvider>
    </WagmiConfig>
  );
}

export default App;
