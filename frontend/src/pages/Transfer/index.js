import React, { useState } from 'react';
import styled from 'styled-components';
import FormInput from '../../components/FormInput';
import FormSelect from '../../components/FormSelect';

const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 20px;
`;

const Title = styled.h1`
  font-size: 2rem;
  margin-bottom: 20px;
`;

const Subtitle = styled.p`
  font-size: 1rem;
  margin-bottom: 30px;
  color: #555;
`;

const SubmitButton = styled.button`
  background-color: #3498db;
  border: none;
  padding: 12px 24px;
  font-size: 1rem;
  color: #fff;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 20px;

  &:hover {
    background-color: #2980b9;
  }
`;

const TransferTokenPage = () => {
  const [formData, setFormData] = useState({
    tokenAddress: '',
    recipientAddress: '',
    transferAmount: '',
    blockchain: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Placeholder logic for transferring tokens
    alert('Token Transfer Initiated!');
  };

  const blockchainOptions = [
    { value: '', label: 'Select Blockchain' },
    { value: 'zeta', label: 'ZetaChain' },
    { value: 'eth', label: 'Ethereum' }
  ];

  return (
    <Container>
      <Title>Transfer Your Tokens</Title>
      <Subtitle>Enter the details to transfer your tokens.</Subtitle>
      <form onSubmit={handleSubmit}>
        <FormInput
          id="tokenAddress"
          label="Token Address"
          name="tokenAddress"
          value={formData.tokenAddress}
          onChange={handleChange}
        />
        <FormInput
          id="recipientAddress"
          label="Recipient Address"
          name="recipientAddress"
          value={formData.recipientAddress}
          onChange={handleChange}
        />
        <FormInput
          id="transferAmount"
          label="Amount to Transfer"
          name="transferAmount"
          value={formData.transferAmount}
          onChange={handleChange}
        />
        <FormSelect
          id="blockchain"
          label="Blockchain"
          name="blockchain"
          options={blockchainOptions}
          value={formData.blockchain}
          onChange={handleChange}
        />
        <SubmitButton type="submit">Transfer Tokens</SubmitButton>
      </form>
    </Container>
  );
};

export default TransferTokenPage; 