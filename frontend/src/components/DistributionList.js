import React from 'react';
import styled from 'styled-components';

const Container = styled.div`
  margin-top: 16px;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
  background-color: rgba(26, 26, 28, 0.6);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.th`
  padding: 12px 16px;
  text-align: left;
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 14px;
  border-bottom: 1px solid var(--border);
`;

const TableCell = styled.td`
  padding: 12px 16px;
  font-size: 14px;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border);
  
  &:last-child {
    text-align: right;
  }
`;

const AddressCell = styled(TableCell)`
  color: var(--accent-primary);
  
  /* Truncate long addresses */
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const AmountCell = styled(TableCell)`
  font-family: monospace;
`;

const EmptyState = styled.div`
  padding: 16px;
  text-align: center;
  color: var(--text-secondary);
`;

const formatAddress = (address) => {
  if (!address || address.length < 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};

const DistributionList = ({ distributions = [], maxDisplay = 5 }) => {
  if (!distributions || distributions.length === 0) {
    return (
      <Container>
        <EmptyState>No distributions added yet</EmptyState>
      </Container>
    );
  }

  const displayDistributions = distributions.slice(0, maxDisplay);
  const hasMore = distributions.length > maxDisplay;

  return (
    <Container>
      <Table>
        <thead>
          <tr>
            <TableHeader>Recipient</TableHeader>
            <TableHeader>Chain</TableHeader>
            <TableHeader>Amount</TableHeader>
          </tr>
        </thead>
        <tbody>
          {displayDistributions.map((dist, index) => (
            <tr key={index}>
              <AddressCell title={dist.address || dist.recipient_address}>
                {formatAddress(dist.address || dist.recipient_address)}
              </AddressCell>
              <TableCell>
                {dist.chain_id === '7001' ? 'ZetaChain Athens' : `Chain ${dist.chain_id}`}
              </TableCell>
              <AmountCell>{dist.amount || dist.token_amount}</AmountCell>
            </tr>
          ))}
          {hasMore && (
            <tr>
              <TableCell colSpan={3} style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                ... and {distributions.length - maxDisplay} more entries
              </TableCell>
            </tr>
          )}
        </tbody>
      </Table>
    </Container>
  );
};

export default DistributionList; 