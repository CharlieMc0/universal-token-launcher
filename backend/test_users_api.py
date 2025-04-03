"""Test the users API endpoint."""

import sys
import asyncio
import httpx
import json
from pprint import pprint

# Sample wallet addresses to test
TEST_ADDRESSES = [
    "0x04dA1034E7d84c004092671bBcEb6B1c8DCda7AE",  # Documentation wallet
    "0x4f1684a28e33f42cdf50ab96e29a709e17249e63",  # Frontend testing wallet
    "0xb7d13b733e483dD492e57CcEd607916cBDd3d0F5"   # Another test wallet
]

async def test_get_user_tokens(address):
    """Test retrieving user tokens."""
    # Use local API URL
    api_url = f"http://localhost:8000/api/users/{address}"
    
    print(f"\nTesting GET {api_url}")
    
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.get(api_url)
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                tokens_count = len(data.get("tokens", []))
                print(f"Success! Found {tokens_count} tokens for {address}")
                
                # Pretty print the response data
                if tokens_count > 0:
                    pprint(data)
            else:
                print(f"Error: {response.text}")
                
        except Exception as e:
            print(f"Request failed: {str(e)}")

async def main():
    """Test all sample addresses."""
    for address in TEST_ADDRESSES:
        await test_get_user_tokens(address)
        print("-" * 80)

if __name__ == "__main__":
    """Execute the test."""
    print("Testing the users API endpoint...")
    
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    asyncio.run(main()) 