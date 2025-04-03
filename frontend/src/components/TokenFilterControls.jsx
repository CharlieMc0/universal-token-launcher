import React from 'react';
import styled from 'styled-components';

// Styled components for filter controls
const FilterContainer = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
`;

const TabsContainer = styled.div`
  display: flex;
  background-color: rgba(42, 42, 45, 0.5);
  border-radius: 8px;
  padding: 4px;
`;

const TabButton = styled.button`
  background-color: ${props => props.active ? 'var(--card-bg)' : 'transparent'};
  color: ${props => props.active ? 'var(--text-primary)' : 'var(--text-secondary)'};
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${props => props.active ? 'var(--card-bg)' : 'rgba(42, 42, 45, 0.8)'};
  }
`;

const SearchContainer = styled.div`
  position: relative;
  width: 240px;
  
  @media (max-width: 768px) {
    width: 100%;
  }
`;

const SearchIcon = styled.span`
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-secondary);
  font-size: 14px;
`;

const SearchInput = styled.input`
  background-color: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 12px 8px 32px;
  color: var(--text-primary);
  font-size: 14px;
  width: 100%;
  
  &::placeholder {
    color: var(--text-secondary);
  }
  
  &:focus {
    border-color: var(--accent-primary);
    outline: none;
  }
`;

const SortContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SortLabel = styled.span`
  font-size: 14px;
  color: var(--text-secondary);
`;

const SortSelect = styled.select`
  background-color: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 12px;
  color: var(--text-primary);
  font-size: 14px;
  
  &:focus {
    border-color: var(--accent-primary);
    outline: none;
  }
`;

/**
 * Token Filter Controls Component
 * 
 * Provides UI controls for filtering, searching, and sorting tokens
 * 
 * @param {Object} props - Component props
 * @param {string} props.filter - Current filter value ('all', 'owned', or 'holdings')
 * @param {Function} props.onFilterChange - Callback when filter changes
 * @param {string} props.searchQuery - Current search query
 * @param {Function} props.onSearchChange - Callback when search query changes
 * @param {string} props.sortOption - Current sort option
 * @param {Function} props.onSortChange - Callback when sort option changes
 */
const TokenFilterControls = ({
  filter = 'all',
  onFilterChange,
  searchQuery = '',
  onSearchChange,
  sortOption = 'balanceDesc',
  onSortChange
}) => {
  // Handle filter change
  const handleFilterChange = (newFilter) => {
    if (typeof onFilterChange === 'function') {
      onFilterChange(newFilter);
    }
  };
  
  // Handle search input change
  const handleSearchChange = (e) => {
    if (typeof onSearchChange === 'function') {
      onSearchChange(e.target.value);
    }
  };
  
  // Handle sort select change
  const handleSortChange = (e) => {
    if (typeof onSortChange === 'function') {
      onSortChange(e.target.value);
    }
  };

  return (
    <FilterContainer>
      <TabsContainer>
        <TabButton 
          active={filter === 'all'} 
          onClick={() => handleFilterChange('all')}
        >
          All Tokens
        </TabButton>
        <TabButton 
          active={filter === 'owned'} 
          onClick={() => handleFilterChange('owned')}
        >
          Tokens You Deployed
        </TabButton>
        <TabButton 
          active={filter === 'holdings'} 
          onClick={() => handleFilterChange('holdings')}
        >
          Tokens You Hold
        </TabButton>
      </TabsContainer>
      
      <SearchContainer>
        <SearchIcon>🔍</SearchIcon>
        <SearchInput 
          placeholder="Search tokens..." 
          value={searchQuery}
          onChange={handleSearchChange}
        />
      </SearchContainer>
      
      <SortContainer>
        <SortLabel>Sort by:</SortLabel>
        <SortSelect value={sortOption} onChange={handleSortChange}>
          <option value="balanceDesc">Highest Balance</option>
          <option value="balanceAsc">Lowest Balance</option>
          <option value="nameAsc">Name (A-Z)</option>
          <option value="nameDesc">Name (Z-A)</option>
          <option value="symbolAsc">Symbol (A-Z)</option>
          <option value="symbolDesc">Symbol (Z-A)</option>
          <option value="createdAtDesc">Newest First</option>
          <option value="createdAtAsc">Oldest First</option>
        </SortSelect>
      </SortContainer>
    </FilterContainer>
  );
};

export default TokenFilterControls; 