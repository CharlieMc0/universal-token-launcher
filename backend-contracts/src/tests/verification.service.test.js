const { expect } = require('chai');
const sinon = require('sinon');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Import the module under test
const verificationService = require('../services/verification/verificationService');
const contractUtils = require('../utils/contracts');
const config = require('../config');

describe('Verification Service', () => {
  let axiosPostStub, axiosGetStub, generateStandardJsonStub, fsExistsStub, fsReadFileStub;
  
  beforeEach(() => {
    // Mock axios POST and GET methods
    axiosPostStub = sinon.stub(axios, 'post');
    axiosGetStub = sinon.stub(axios, 'get');
    
    // Mock filesystem operations
    fsExistsStub = sinon.stub(fs, 'existsSync').returns(true);
    fsReadFileStub = sinon.stub(fs, 'readFileSync').returns('contract code');
    
    // Mock contract utilities
    generateStandardJsonStub = sinon.stub(contractUtils, 'generateStandardJsonInput').returns({
      language: 'Solidity',
      sources: {
        'TestContract.sol': {
          content: 'contract code'
        }
      },
      settings: {
        optimizer: {
          enabled: true,
          runs: 200
        }
      }
    });
  });
  
  afterEach(() => {
    sinon.restore();
  });
  
  describe('verifyContractEtherscan', () => {
    it('should successfully verify contract on Etherscan', async () => {
      // Mock successful verification API responses
      axiosPostStub.onFirstCall().resolves({
        data: {
          status: '1',
          result: 'OK',
          message: 'GUID received for verification',
          data: {
            guid: 'test-guid'
          }
        }
      });
      
      axiosGetStub.resolves({
        data: {
          status: '1',
          result: 'Pass - Verified',
          message: 'Contract source code verified'
        }
      });
      
      // Call the service
      const result = await verificationService.verifyContractEtherscan(
        '0xContractAddress',
        '11155111', // Sepolia chain ID
        'EVMUniversalToken'
      );
      
      // Assert
      expect(result.success).to.be.true;
      expect(result.message).to.include('Contract verified successfully');
      expect(result.status).to.equal('verified');
      expect(result.explorerUrl).to.include('0xContractAddress');
      expect(axiosPostStub.calledOnce).to.be.true;
      expect(axiosGetStub.calledOnce).to.be.true;
    });
    
    it('should handle verification failure', async () => {
      // Mock API response for failure
      axiosPostStub.resolves({
        data: {
          status: '0',
          result: null,
          message: 'Invalid API Key',
          data: null
        }
      });
      
      // Call the service
      const result = await verificationService.verifyContractEtherscan(
        '0xContractAddress',
        '11155111', // Sepolia chain ID
        'EVMUniversalToken'
      );
      
      // Assert
      expect(result.success).to.be.false;
      expect(result.message).to.include('Verification failed');
      expect(result.status).to.equal('failed');
      expect(axiosPostStub.calledOnce).to.be.true;
      expect(axiosGetStub.called).to.be.false;
    });
  });
  
  describe('verifyContractBlockscout', () => {
    it('should successfully verify contract on Blockscout', async () => {
      // Mock successful verification API response
      axiosPostStub.resolves({
        data: {
          message: 'OK',
          status: '1',
          result: {
            verification_id: 'test-verification-id'
          }
        }
      });
      
      axiosGetStub.resolves({
        data: {
          message: 'OK',
          status: '1',
          result: {
            status: 'Pass - Verified'
          }
        }
      });
      
      // Call the service
      const result = await verificationService.verifyContractBlockscout(
        '0xContractAddress',
        '7001', // ZetaChain ID
        'ZetaChainUniversalToken'
      );
      
      // Assert
      expect(result.success).to.be.true;
      expect(result.message).to.include('Contract verified successfully');
      expect(result.status).to.equal('verified');
      expect(result.explorerUrl).to.include('0xContractAddress');
      expect(axiosPostStub.calledOnce).to.be.true;
      expect(axiosGetStub.calledOnce).to.be.true;
    });
    
    it('should handle verification failure', async () => {
      // Mock API response for failure
      axiosPostStub.resolves({
        data: {
          message: 'Error',
          status: '0',
          result: null
        }
      });
      
      // Call the service
      const result = await verificationService.verifyContractBlockscout(
        '0xContractAddress',
        '7001', // ZetaChain ID
        'ZetaChainUniversalToken'
      );
      
      // Assert
      expect(result.success).to.be.false;
      expect(result.message).to.include('Verification failed');
      expect(result.status).to.equal('failed');
      expect(axiosPostStub.calledOnce).to.be.true;
      expect(axiosGetStub.called).to.be.false;
    });
  });
  
  describe('verifyContract', () => {
    it('should route to ZetaChain verifier for ZetaChain', async () => {
      // Setup a stub for verifyContractBlockscout to ensure we don't actually call the API
      const blockscoutStub = sinon.stub(verificationService, 'verifyContractBlockscout').resolves({
        success: true,
        message: 'Contract verified successfully',
        status: 'verified',
        explorerUrl: 'https://explorer.zetachain.com/address/0xContractAddress'
      });
      
      // Call the service with ZetaChain chain ID
      const result = await verificationService.verifyContract(
        '0xContractAddress',
        '7001',
        'ZetaChainUniversalToken'
      );
      
      // Assert
      expect(result.success).to.be.true;
      expect(blockscoutStub.calledOnce).to.be.true;
      expect(blockscoutStub.firstCall.args[0]).to.equal('0xContractAddress');
      expect(blockscoutStub.firstCall.args[1]).to.equal('7001');
    });
    
    it('should route to Etherscan verifier for Sepolia', async () => {
      // Setup a stub for verifyContractEtherscan to ensure we don't actually call the API
      const etherscanStub = sinon.stub(verificationService, 'verifyContractEtherscan').resolves({
        success: true,
        message: 'Contract verified successfully',
        status: 'verified',
        explorerUrl: 'https://sepolia.etherscan.io/address/0xContractAddress'
      });
      
      // Call the service with Sepolia chain ID
      const result = await verificationService.verifyContract(
        '0xContractAddress',
        '11155111',
        'EVMUniversalToken'
      );
      
      // Assert
      expect(result.success).to.be.true;
      expect(etherscanStub.calledOnce).to.be.true;
      expect(etherscanStub.firstCall.args[0]).to.equal('0xContractAddress');
      expect(etherscanStub.firstCall.args[1]).to.equal('11155111');
      expect(result.status).to.equal('verified');
      expect(result.explorerUrl).to.include('sepolia.etherscan.io');
    });
    
    it('should route to Polygonscan verifier for Polygon mainnet', async () => {
      // Setup a stub for verifyContractEtherscan to ensure we don't actually call the API
      const etherscanStub = sinon.stub(verificationService, 'verifyContractEtherscan').resolves({
        success: true,
        message: 'Contract verified successfully',
        status: 'verified',
        explorerUrl: 'https://polygonscan.com/address/0xContractAddress'
      });
      
      // Call the service with Polygon chain ID
      const result = await verificationService.verifyContract(
        '0xContractAddress',
        '137',
        'EVMUniversalToken'
      );
      
      // Assert
      expect(result.success).to.be.true;
      expect(etherscanStub.calledOnce).to.be.true;
      expect(etherscanStub.firstCall.args[0]).to.equal('0xContractAddress');
      expect(etherscanStub.firstCall.args[1]).to.equal('137');
      expect(result.status).to.equal('verified');
      expect(result.explorerUrl).to.include('polygonscan.com');
    });
    
    it('should handle unsupported chains', async () => {
      // Call the service with unsupported chain ID
      const result = await verificationService.verifyContract(
        '0xContractAddress',
        '999999', // Fictitious chain ID
        'EVMUniversalToken'
      );
      
      // Assert
      expect(result.success).to.be.false;
      expect(result.message).to.include('Chain configuration not found');
    });
  });
}); 