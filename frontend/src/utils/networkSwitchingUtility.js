const ZETACHAIN_ID = 7001; // Athens Testnet

/**
 * Switches the user's wallet to the ZetaChain network.
 * It first attempts to switch the network. If the network is not added (error code 4902),
 * it tries to add the network with the required configuration.
 * 
 * @returns {Promise<void>} A promise that resolves when the network switch (or addition) is complete.
 */
export async function switchToZetaChain() {
  if (!window.ethereum) {
    console.error('window.ethereum is not available.');
    return;
  }

  try {
    // Attempt to switch network
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${ZETACHAIN_ID.toString(16)}` }],
    });
  } catch (error) {
    // If the network has not been added, error code 4902 will be returned
    if (error.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: `0x${ZETACHAIN_ID.toString(16)}`,
            chainName: 'ZetaChain Athens',
            nativeCurrency: {
              name: 'ZETA',
              symbol: 'ZETA',
              decimals: 18,
            },
            rpcUrls: ['https://zetachain-athens.g.allthatnode.com/archive/evm'],
            blockExplorerUrls: ['https://explorer.zetachain.com'],
          }],
        });
      } catch (addError) {
        console.error('Error adding ZetaChain network:', addError);
      }
    } else {
      console.error('Error switching to ZetaChain network:', error);
    }
  }
} 