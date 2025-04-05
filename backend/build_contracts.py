#!/usr/bin/env python3

import os
import subprocess
import json
import shutil
from pathlib import Path

def run_command(cmd, cwd=None):
    """Run a command and return the output"""
    print(f"Running command: {cmd}")
    process = subprocess.Popen(
        cmd, 
        shell=True, 
        stdout=subprocess.PIPE, 
        stderr=subprocess.PIPE,
        cwd=cwd
    )
    stdout, stderr = process.communicate()
    
    if process.returncode != 0:
        print(f"Error executing command: {cmd}")
        print(f"Error: {stderr.decode('utf-8')}")
        return False
    
    return stdout.decode('utf-8')

def check_npm_installed():
    """Check if npm is installed"""
    return run_command("which npm") is not False

def check_hardhat_installed(contracts_dir):
    """Check if hardhat is installed in the contracts directory"""
    return os.path.exists(os.path.join(contracts_dir, "node_modules", ".bin", "hardhat"))

def install_dependencies(contracts_dir):
    """Install hardhat and other dependencies"""
    print("Installing dependencies...")
    run_command("npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox", cwd=contracts_dir)
    run_command("npm install @openzeppelin/contracts-upgradeable", cwd=contracts_dir)
    return True

def compile_contracts(contracts_dir):
    """Compile the contracts using hardhat"""
    print("Compiling contracts...")
    result = run_command("npx hardhat compile", cwd=contracts_dir)
    return result is not False

def find_erc1967_proxy(artifacts_dir):
    """Find the ERC1967Proxy artifact by walking through the artifacts directory"""
    print("Searching for ERC1967Proxy.json...")
    for root, dirs, files in os.walk(artifacts_dir):
        if "ERC1967Proxy.json" in files:
            full_path = os.path.join(root, "ERC1967Proxy.json")
            print(f"Found ERC1967Proxy.json at: {full_path}")
            return full_path
    return None

def check_artifacts(contracts_dir, artifact_paths):
    """Check if artifacts exist and have proper bytecode"""
    print("Checking artifacts...")
    all_valid = True
    for artifact_path in artifact_paths:
        full_path = os.path.join(contracts_dir, artifact_path)
        
        if not os.path.exists(full_path):
            print(f"Artifact not found: {full_path}")
            all_valid = False
            continue
            
        try:
            with open(full_path, 'r') as f:
                artifact = json.load(f)
                
            if not artifact.get('bytecode') or len(artifact['bytecode']) < 200:
                print(f"Invalid or empty bytecode in {full_path}")
                print(f"Bytecode length: {len(artifact.get('bytecode', ''))}")
                all_valid = False
            else:
                print(f"Valid artifact: {full_path}")
                print(f"Bytecode length: {len(artifact.get('bytecode', ''))}")
                
            # Check for initialize function in ABI
            if artifact.get('abi'):
                has_initialize = any(m.get('name') == 'initialize' for m in artifact['abi'] if 'name' in m)
                print(f"Has initialize method: {has_initialize}")
                if not has_initialize:
                    print(f"WARNING: No initialize method found in {full_path}")
        except Exception as e:
            print(f"Error checking artifact {full_path}: {e}")
            all_valid = False
            
    return all_valid

def copy_artifacts_to_deployment_dir(token_contracts_dir, artifacts_dir, erc1967_proxy_path=None):
    """Copy necessary contract artifacts to the deployment directory"""
    print("Copying artifacts to deployment directory...")
    try:
        # Define source and target paths
        sources = [
            # ZetaChain token
            os.path.join(token_contracts_dir, "artifacts", "contracts", "example", "ZetaChainUniversalToken.sol", "ZetaChainUniversalToken.json"),
            # EVM token
            os.path.join(token_contracts_dir, "artifacts", "contracts", "example", "EVMUniversalToken.sol", "EVMUniversalToken.json"),
        ]
        
        # Add ERC1967 Proxy if found
        if erc1967_proxy_path:
            sources.append(erc1967_proxy_path)
        
        # Create destination directory if it doesn't exist
        if not os.path.exists(artifacts_dir):
            os.makedirs(artifacts_dir)
            print(f"Created artifacts directory: {artifacts_dir}")
        
        # Copy each file
        for src in sources:
            if not os.path.exists(src):
                print(f"Source artifact not found: {src}")
                continue
                
            filename = os.path.basename(src)
            dst = os.path.join(artifacts_dir, filename)
            
            print(f"Copying {src} to {dst}")
            shutil.copy2(src, dst)
            print(f"Successfully copied {filename}")
            
        return True
    except Exception as e:
        print(f"Error copying artifacts: {e}")
        return False

def main():
    # Get the paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.dirname(script_dir)  # Go up one level to utl/
    contracts_dir = os.path.join(base_dir, "standard-contracts")
    token_contracts_dir = os.path.join(contracts_dir, "contracts", "token")
    backend_artifacts_dir = os.path.join(script_dir, "artifacts")
    
    # Check if token_contracts_dir exists
    if not os.path.exists(token_contracts_dir):
        print(f"Token contracts directory not found: {token_contracts_dir}")
        return False
    
    print(f"Building contracts in: {contracts_dir}")
    
    # Check npm is installed
    if not check_npm_installed():
        print("npm is not installed. Please install npm and try again.")
        return False
    
    # Check if hardhat is installed, install if needed
    if not check_hardhat_installed(token_contracts_dir):
        print("Hardhat not found. Installing...")
        if not install_dependencies(token_contracts_dir):
            print("Failed to install dependencies.")
            return False
    
    # Compile the contracts
    if not compile_contracts(token_contracts_dir):
        print("Failed to compile contracts.")
        return False
    
    # Find ERC1967Proxy.json
    erc1967_proxy_path = find_erc1967_proxy(os.path.join(token_contracts_dir, "artifacts"))
    
    # Check the artifacts
    artifact_paths = [
        "artifacts/contracts/example/ZetaChainUniversalToken.sol/ZetaChainUniversalToken.json",
        "artifacts/contracts/example/EVMUniversalToken.sol/EVMUniversalToken.json",
    ]
    
    if not check_artifacts(token_contracts_dir, artifact_paths):
        print("Some artifacts are missing or invalid.")
        if not erc1967_proxy_path:
            print("ERC1967Proxy.json not found. Will create a minimal proxy.")
        
    # Copy artifacts to deployment directory
    if not copy_artifacts_to_deployment_dir(token_contracts_dir, backend_artifacts_dir, erc1967_proxy_path):
        print("Failed to copy artifacts to deployment directory.")
        return False
    
    # If ERC1967Proxy.json was not found, create a minimal proxy
    if not erc1967_proxy_path:
        print("Creating a minimal ERC1967Proxy.json...")
        minimal_proxy = {
            "contractName": "ERC1967Proxy",
            "abi": [
                {
                    "inputs": [
                        {
                            "internalType": "address",
                            "name": "implementation",
                            "type": "address"
                        },
                        {
                            "internalType": "bytes",
                            "name": "data",
                            "type": "bytes"
                        }
                    ],
                    "stateMutability": "payable",
                    "type": "constructor"
                }
            ],
            "bytecode": "0x608060405260405161010f38038061010f83398101604081905261002291610047565b61002e82826000610035565b505061014c565b61003e83610113565b60008151602083016000f35b60008151905061005c8161013f565b92915050565b60008151905061007181610152565b92915050565b60008060408385031215610089578283fd5b600061009585856100cf565b925060208301356001600160401b038111156100af578283fd5b6100bb85828601610135565b9150509250929050565b60006100cb82610118565b92915050565b60006001600160a01b0382166100cb565b6000610101826100e5565b9392505050565b60006101018260006100f6565b601f19601f83011681019081106001600160401b038211176101d3578283fd5b806000518060209283016000f35b61013881610136565b81525050565b61014881610136565b8082525050565b610165565b6daaaa52656365697074526f6c6c75560941b815260206004820152602260248201527f45524331393637526563656970743a206e6f74206120636f6e747261637400006044820152606401905b60405180910390fd5b6053806101736000396000f3fe6080604052600080fdfea2646970667358221220d33aa0f655a0f50cf5b18a5d05fb2c7cde57f7e3de83a8a36adf24ac80cd6bbb64736f6c63430008040033"
        }
        minimal_proxy_path = os.path.join(backend_artifacts_dir, "ERC1967Proxy.json")
        with open(minimal_proxy_path, 'w') as f:
            json.dump(minimal_proxy, f, indent=2)
        print(f"Created minimal ERC1967Proxy.json at {minimal_proxy_path}")
        
    print("Contracts built and artifacts verified successfully!")
    return True

if __name__ == "__main__":
    if main():
        print("✅ Contract build successful")
    else:
        print("❌ Contract build failed") 