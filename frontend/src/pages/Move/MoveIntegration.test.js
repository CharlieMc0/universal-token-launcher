import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MovePage from './index';
import { useAccount, useChainId } from 'wagmi';
import apiService from '../../services/apiService';

// Mock wagmi hooks
jest.mock('wagmi', () => ({
  useAccount: jest.fn(),
  useChainId: jest.fn()
}));

// Mock API service
jest.mock('../../services/apiService', () => ({
  getUserTokens: jest.fn(),
  moveToken: jest.fn()
}));

describe('Move Page Integration Tests', () => {
  const mockWalletAddress = '0x1234...5678';
  const mockChainId = '7001'; // ZetaChain testnet
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock wagmi hooks
    useAccount.mockReturnValue({
      address: mockWalletAddress,
      isConnected: true
    });
    useChainId.mockReturnValue(mockChainId);
    
    // Mock API responses
    apiService.getUserTokens.mockResolvedValue([
      {
        id: 1,
        name: 'Test Token',
        symbol: 'TEST',
        chainInfo: [
          {
            chainId: '7001',
            name: 'ZetaChain',
            balance: '1000000000000000000'
          },
          {
            chainId: '11155111',
            name: 'Sepolia',
            balance: '0'
          }
        ]
      }
    ]);
  });
  
  it('renders the Move page with token selection', async () => {
    render(<MovePage />);
    
    // Check page title and description
    await waitFor(() => {
      expect(screen.getByText('Move Digital Assets')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText(/seamlessly across multiple blockchains/i)).toBeInTheDocument();
    });
    
    // Check asset type selector
    await waitFor(() => {
      expect(screen.getByText('Move Tokens')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('Move NFTs')).toBeInTheDocument();
    });
  });
  
  it('allows switching between token and NFT views', async () => {
    render(<MovePage />);
    
    // Initially shows token view
    await waitFor(() => {
      expect(screen.getByText('Move Tokens')).toBeInTheDocument();
    });
    
    // Switch to NFT view
    fireEvent.click(screen.getByText('Move NFTs'));
    await waitFor(() => {
      expect(screen.getByText('Move Universal NFTs')).toBeInTheDocument();
    });
    
    // Switch back to token view
    fireEvent.click(screen.getByText('Move Tokens'));
    await waitFor(() => {
      expect(screen.getByText('Test Token')).toBeInTheDocument();
    });
  });
  
  it('loads and displays user tokens', async () => {
    render(<MovePage />);
    
    // Verify API was called
    expect(apiService.getUserTokens).toHaveBeenCalledWith(mockWalletAddress);
    
    // Check if token is displayed
    await waitFor(() => {
      expect(screen.getByText('Test Token')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('TEST')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('1.0')).toBeInTheDocument(); // Formatted balance
    });
  });
  
  it('handles token movement flow', async () => {
    apiService.moveToken.mockResolvedValue({
      success: true,
      transactionHash: '0x1234...5678'
    });
    
    render(<MovePage />);
    
    // Select a token
    await waitFor(() => {
      expect(screen.getByText('Test Token')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Test Token'));
    
    // Select destination chain
    fireEvent.click(screen.getByText('Sepolia'));
    
    // Enter recipient address
    fireEvent.change(screen.getByPlaceholderText(/recipient address/i), {
      target: { value: '0x9876...5432' }
    });
    
    // Click move button
    fireEvent.click(screen.getByText('Move Token'));
    
    // Verify API call
    expect(apiService.moveToken).toHaveBeenCalledWith({
      tokenId: 1,
      sourceChainId: '7001',
      destinationChainId: '11155111',
      recipientAddress: '0x9876...5432',
      amount: '1000000000000000000'
    });
    
    // Check success message
    await waitFor(() => {
      expect(screen.getByText(/successfully moved/i)).toBeInTheDocument();
    });
  });
  
  it('handles movement errors gracefully', async () => {
    const errorMessage = 'Insufficient balance for movement';
    apiService.moveToken.mockRejectedValue(new Error(errorMessage));
    
    render(<MovePage />);
    
    // Select a token and try to move
    await waitFor(() => {
      expect(screen.getByText('Test Token')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Test Token'));
    fireEvent.click(screen.getByText('Sepolia'));
    fireEvent.change(screen.getByPlaceholderText(/recipient address/i), {
      target: { value: '0x9876...5432' }
    });
    fireEvent.click(screen.getByText('Move Token'));
    
    // Check error message
    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });
}); 