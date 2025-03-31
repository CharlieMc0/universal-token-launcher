// App Configuration

const CONFIG = {
    // API endpoint (change to production URL when deploying)
    API_URL: 'http://localhost:8000',
    
    // ZetaChain settings
    ZETA_CHAIN_ID: '7000',  // ZetaChain mainnet ID
    FIXED_ZETA_FEE: 1.5,     // Fee in ZETA
    
    // Supported chains for deployment
    SUPPORTED_CHAINS: [
        {
            id: '1',
            name: 'Ethereum',
            icon: 'ethereum.svg'
        },
        {
            id: '137',
            name: 'Polygon',
            icon: 'polygon.svg'
        },
        {
            id: '56',
            name: 'BNB Chain',
            icon: 'bnb.svg'
        },
        {
            id: '43114',
            name: 'Avalanche',
            icon: 'avalanche.svg'
        },
        {
            id: '42161',
            name: 'Arbitrum',
            icon: 'arbitrum.svg'
        }
    ],
    
    // Coming soon chains (displayed but disabled)
    COMING_SOON_CHAINS: [
        {
            id: 'solana',
            name: 'Solana',
            icon: 'solana.svg'
        },
        {
            id: 'ton',
            name: 'TON',
            icon: 'ton.svg'
        },
        {
            id: 'sui',
            name: 'Sui',
            icon: 'sui.svg'
        }
    ],
    
    // Token deployment settings
    MAX_CSV_ROWS: 100,
    MAX_ICON_SIZE: 2 * 1024 * 1024  // 2 MB
}; 