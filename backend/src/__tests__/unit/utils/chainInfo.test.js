const chainInfo = require('../../../utils/chainInfo');

describe('ChainInfo Utils', () => {
  describe('getChainInfo', () => {
    it('should return chain information for a valid chain ID', () => {
      const info = chainInfo.getChainInfo('7001');
      expect(info).toBeDefined();
      expect(info.name).toBe('ZetaChain Testnet');
      expect(info.isZetaChain).toBe(true);
    });

    it('should return null for an invalid chain ID', () => {
      const info = chainInfo.getChainInfo('999999');
      expect(info).toBeUndefined();
    });

    it('should handle numeric chain IDs by converting to string', () => {
      const info = chainInfo.getChainInfo(7001);
      expect(info).toBeDefined();
      expect(info.name).toBe('ZetaChain Testnet');
    });
  });

  describe('isZetaChain', () => {
    it('should return true for ZetaChain IDs', () => {
      expect(chainInfo.isZetaChain('7000')).toBe(true);
      expect(chainInfo.isZetaChain('7001')).toBe(true);
    });

    it('should return false for non-ZetaChain IDs', () => {
      expect(chainInfo.isZetaChain('1')).toBe(false);
      expect(chainInfo.isZetaChain('11155111')).toBe(false);
      expect(chainInfo.isZetaChain('999999')).toBe(false);
    });
  });

  describe('getPrimaryZetaChainId', () => {
    it('should return the correct ZetaChain ID based on environment', () => {
      const originalEnv = process.env.NODE_ENV;
      
      // Test production mode
      process.env.NODE_ENV = 'production';
      expect(chainInfo.getPrimaryZetaChainId()).toBe('7000');
      
      // Test non-production mode
      process.env.NODE_ENV = 'development';
      expect(chainInfo.getPrimaryZetaChainId()).toBe('7001');
      
      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('findZetaChainId', () => {
    it('should find ZetaChain ID in an array of chain IDs', () => {
      // Test with primary ZetaChain ID
      const chains1 = ['1', '7001', '11155111'];
      expect(chainInfo.findZetaChainId(chains1)).toBe('7001');
      
      // Test with alternate ZetaChain ID
      const chains2 = ['1', '7000', '11155111'];
      expect(chainInfo.findZetaChainId(chains2)).toBe('7000');
      
      // Test with no ZetaChain ID
      const chains3 = ['1', '11155111', '137'];
      expect(chainInfo.findZetaChainId(chains3)).toBeNull();
    });
    
    it('should handle invalid inputs', () => {
      expect(chainInfo.findZetaChainId(null)).toBeNull();
      expect(chainInfo.findZetaChainId(undefined)).toBeNull();
      expect(chainInfo.findZetaChainId('not-an-array')).toBeNull();
      expect(chainInfo.findZetaChainId([])).toBeNull();
    });
  });

  describe('getExplorerTxUrl and getExplorerAddressUrl', () => {
    it('should generate correct explorer URLs for transactions', () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      
      // Test ZetaChain explorer URL
      const zetaUrl = chainInfo.getExplorerTxUrl('7001', txHash);
      expect(zetaUrl).toBe(`https://athens.explorer.zetachain.com/tx/${txHash}`);
      
      // Test Ethereum explorer URL
      const ethUrl = chainInfo.getExplorerTxUrl('11155111', txHash);
      expect(ethUrl).toBe(`https://sepolia.etherscan.io/tx/${txHash}`);
    });
    
    it('should generate correct explorer URLs for addresses', () => {
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      
      // Test ZetaChain explorer URL
      const zetaUrl = chainInfo.getExplorerAddressUrl('7001', address);
      expect(zetaUrl).toBe(`https://athens.explorer.zetachain.com/address/${address}`);
      
      // Test Ethereum explorer URL
      const ethUrl = chainInfo.getExplorerAddressUrl('11155111', address);
      expect(ethUrl).toBe(`https://sepolia.etherscan.io/address/${address}`);
    });
    
    it('should return null for invalid chain IDs', () => {
      const txHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      expect(chainInfo.getExplorerTxUrl('999999', txHash)).toBeNull();
      
      const address = '0x1234567890abcdef1234567890abcdef12345678';
      expect(chainInfo.getExplorerAddressUrl('999999', address)).toBeNull();
    });
  });

  describe('getFormattedChainInfo', () => {
    it('should return formatted chain information with display properties', () => {
      const info = chainInfo.getFormattedChainInfo('7001');
      
      expect(info).toBeDefined();
      expect(info.name).toBe('ZetaChain Testnet');
      expect(info.color).toBe('#00B386');
      expect(info.shortName).toBe('ZetaChain');
      expect(info.isTestnet).toBe(true);
      expect(info.isSupported).toBe(true);
    });
    
    it('should handle unknown chain IDs gracefully', () => {
      const info = chainInfo.getFormattedChainInfo('999999');
      
      expect(info).toBeDefined();
      expect(info.name).toBe('Unknown Chain (999999)');
      expect(info.isSupported).toBe(false);
    });
  });

  describe('getFormattedChainInfoList', () => {
    it('should return an array of formatted chain information objects', () => {
      const chainIds = ['7001', '11155111'];
      const infoList = chainInfo.getFormattedChainInfoList(chainIds);
      
      expect(infoList).toBeInstanceOf(Array);
      expect(infoList).toHaveLength(2);
      
      // Check ZetaChain info
      expect(infoList[0].name).toBe('ZetaChain Testnet');
      expect(infoList[0].isZetaChain).toBe(true);
      
      // Check Sepolia info
      expect(infoList[1].name).toBe('Sepolia');
      expect(infoList[1].isZetaChain).toBe(false);
    });
    
    it('should handle invalid inputs', () => {
      expect(chainInfo.getFormattedChainInfoList(null)).toEqual([]);
      expect(chainInfo.getFormattedChainInfoList(undefined)).toEqual([]);
      expect(chainInfo.getFormattedChainInfoList('not-an-array')).toEqual([]);
      expect(chainInfo.getFormattedChainInfoList([])).toEqual([]);
    });
  });
}); 