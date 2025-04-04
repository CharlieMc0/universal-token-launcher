#!/bin/bash

# Script to run the Sepolia verification test

# Activate virtual environment
source venv_311/bin/activate

# Check if contract address is provided
if [ -z "$1" ]; then
  echo "Error: Contract address not provided"
  echo "Usage: ./verify_sepolia.sh <contract_address> [owner_address]"
  exit 1
fi

CONTRACT_ADDRESS="$1"
OWNER_ADDRESS="$2"

# Export environment variables from .env file
export $(grep -v '^#' .env | xargs)

# Set specific variables for Sepolia
if [ -z "$SEPOLIA_API_KEY" ] && [ -n "$ETHERSCAN_API_KEY" ]; then
  export SEPOLIA_API_KEY="$ETHERSCAN_API_KEY"
  echo "Using ETHERSCAN_API_KEY for Sepolia verification"
fi

if [ -z "$SEPOLIA_API_KEY" ]; then
  echo "Error: SEPOLIA_API_KEY or ETHERSCAN_API_KEY not set in .env file"
  exit 1
fi

echo "Running verification test for contract: $CONTRACT_ADDRESS"

# Fix Python module import by adding the current directory to PYTHONPATH
export PYTHONPATH="$PYTHONPATH:$(pwd)"

# Run the verification script
if [ -n "$OWNER_ADDRESS" ]; then
  python tests/test_sepolia_verification.py "$CONTRACT_ADDRESS" --owner "$OWNER_ADDRESS"
else
  python tests/test_sepolia_verification.py "$CONTRACT_ADDRESS"
fi

# Capture exit code
EXIT_CODE=$?

# Deactivate virtual environment
deactivate

# Return the exit code from the Python script
exit $EXIT_CODE 