import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAccount, useSwitchNetwork } from 'wagmi';

// Create the context
const NetworkModeContext = createContext({
  networkMode: 'testnet',
  toggleNetworkMode: () => {}
});

// Create a provider component
export const NetworkModeProvider = ({ children }) => {
  const [networkMode, setNetworkMode] = useState('testnet'); // Default to 'testnet'
  
  // Safely access wagmi hooks with error handling
  const account = useAccount();
  const switchNetworkHook = useSwitchNetwork();
  
  const isConnected = account?.isConnected;
  const switchNetwork = switchNetworkHook?.switchNetwork;
  
  // Function to toggle between testnet and mainnet
  const toggleNetworkMode = async () => {
    const newMode = networkMode === 'testnet' ? 'mainnet' : 'testnet';
    
    // Try to switch the wallet network if connected
    if (isConnected && switchNetwork) {
      try {
        const targetChainId = newMode === 'testnet' ? 7001 : 7000; // ZetaChain testnet or mainnet
        await switchNetwork(targetChainId);
      } catch (error) {
        console.error('Failed to switch network:', error);
      }
    }
    
    // Update the network mode state
    setNetworkMode(newMode);
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

// Set default export to match imports from other files
export default NetworkModeProvider; 