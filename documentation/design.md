# 🎨 Universal Launcher – Design Language & UI System

## ✨ Visual Identity

### Tone & Style
- Visual Tone: Futuristic, clean, minimal
- Mood: Confident, efficient, next-gen
- Audience: Web3-native users, builders, and token creators

---

## 🎨 Color Palette

| Token             | Color     | Use Cases                              |
|------------------|-----------|----------------------------------------|
| --bg-primary      | #0C0C0E   | App background                         |
| --accent-primary  | #3C9DF2   | Primary CTA buttons, links             |
| --accent-secondary| #00E8B5   | Success states, bridge status          |
| --text-primary    | #FFFFFF   | Main body text                         |
| --text-secondary  | #B0B0B0   | Placeholder/Muted text                 |
| --error           | #FF5252   | Validation errors, alerts              |
| --card-bg         | #1A1A1C   | Cards, panels, modals background       |
| --border          | #2A2A2D   | Input borders, section dividers        |

---

## 🖋 Typography

### Font Stack
- Primary: Inter, sans-serif
- Fallbacks: SF Pro, Satoshi, Helvetica Neue

### Sizing Scale

| Element           | Font Size | Weight |
|------------------|-----------|--------|
| H1 (Page Title)   | 32px      | 700    |
| H2 (Section)      | 24px      | 600    |
| Body Text         | 16px      | 400    |
| Caption / Label   | 13px      | 500    |

---

## 📐 Spacing & Layout

- Grid: 8pt spacing system
- Container Max Width: 1200px (main), 1100px (content), 800px (forms)
- Section Padding: 24px or 48px depending on screen size
- Form Container Padding: 24px (consistent across all form sections)
- Card Padding: 16px
- Border Radius: 8px for buttons, 12px for containers/cards

### Component Spacing
- Margin between form sections: 32px
- Margin between form rows: 16px
- Gap between form inputs in a row: 16px
- Section title margin-bottom: 16px

---

## 🧩 Component Library

### Page Structure

#### Page Containers
All main pages should use the following structure:
```jsx
const PageContainer = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 20px;
`;

const PageTitle = styled.h1`
  margin-bottom: 16px;
  text-align: center;
`;

const PageDescription = styled.p`
  text-align: center;
  color: var(--text-secondary);
  margin-bottom: 40px;
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
`;
```

#### Form Containers
All form sections should use this container style:
```jsx
const FormContainer = styled.div`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 32px;
`;

const SectionTitle = styled.h2`
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 16px;
`;
```

#### Form Layout
Form elements should use the following structure:
```jsx
const FormRow = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const FormGroup = styled.div`
  flex: 1;
`;

const FullWidthFormGroup = styled.div`
  width: 100%;
  margin-bottom: 16px;
`;
```

### Buttons

Example:
<button class="btn-primary">Launch Token</button>

Variants:
- Primary: Accent blue background, white text, padding: 14px 32px
- Secondary: Transparent with blue border
- Disabled: Grayed out, no hover state
- Toggle: Used for tab-like functionality, rounded edges when used in pairs

Button Container:
```jsx
const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 32px;
`;
```

**Interaction & Feedback:**
- **Hover State:** Subtle scale transform (`transform: scale(1.03);`) and brightness increase (`filter: brightness(1.1);`)
- **Active State:** Slightly larger scale (`transform: scale(0.98);`) and darker background/border.
- **Transitions:** Apply smooth transitions (`transition: all 0.2s ease-in-out;`) to hover/active states.

### Inputs

Example:
<input type="text" placeholder="Token Name" class="input-lg" />

Input Sizes:
- Small: 8px padding, 13px font
- Medium: 12px padding, 16px font
- Large: 16px padding, 18px font

Styles:
- Focus: Blue glow shadow
- Error: Red border and helper message

**Interaction & Feedback:**
- **Focus State:** Combine `var(--accent-primary)` border color with the existing blue glow shadow (`box-shadow: 0 0 0 3px rgba(60, 157, 242, 0.3);`). Add transition.
- **Error State:** Combine red border (`border-color: var(--error);`) with subtle red glow (`box-shadow: 0 0 0 3px rgba(255, 82, 82, 0.2);`). Field highlight persists until error is resolved.
- **Disabled/Read-Only:** Clearly differentiate visually (e.g., lighter grey background for disabled, different border style for read-only).

### Cards & Containers

- Background: --card-bg
- Padding: 24px (consistent)
- Rounded corners: 12px
- Shadow: Subtle ambient glow (rgba(0, 232, 181, 0.1))

Container Types:
- FormContainer: Used for grouped form elements with section titles
- FeeInfo: Light blue background (rgba(60, 157, 242, 0.1)), 16px padding, 8px border radius
- ConfirmationContainer / Results Display: Can reuse `FormContainer` styles. Ensure consistent internal spacing and hierarchy. Use styled dividers (`<hr style="border-color: var(--border); opacity: 0.5;">`) or subtle background variations (`background-color: rgba(255, 255, 255, 0.03); padding: 8px; border-radius: 4px;`) for list items (like deployment logs) to improve structure without adding clutter. Display status/links effectively.
- **Loading States:** Utilize skeleton loaders (`div` with animated gradient background) for components fetching data. For actions, use spinner icons within buttons or dedicated loading indicators.

### Toggle Components

Used for switching between different modes (e.g., tokens vs NFTs):

```jsx
const ToggleContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 40px;
`;

const ToggleButton = styled.button`
  background-color: ${props => props.active ? 'var(--accent-primary)' : 'transparent'};
  color: ${props => props.active ? 'white' : 'var(--text-secondary)'};
  border: 1px solid ${props => props.active ? 'var(--accent-primary)' : 'var(--border)'};
  border-radius: ${props => props.position === 'left' ? '8px 0 0 8px' : '0 8px 8px 0'};
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
`;
```

**Enhancement:** Implement a "sliding pill" background style for the active toggle option instead of just changing button styles for a more modern feel.

### Floating Transfer Box

Used for contextual transfer operations that appear when a token is selected:

```jsx
const FloatingTransferBox = styled.div`
  position: fixed;
  top: 100px;
  right: 24px;
  width: 320px;
  background-color: var(--card-bg);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 20px;
  z-index: 100;
  max-height: calc(100vh - 150px);
  overflow-y: auto;
  border: 2px solid var(--accent-primary);
  
  @media (max-width: 1200px) {
    position: static;
    width: 100%;
    margin-top: 24px;
    max-height: none;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 12px;
  right: 12px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 18px;
  cursor: pointer;
  line-height: 1;
  
  &:hover {
    color: var(--accent-primary);
  }
`;

const TransferBoxTitle = styled.h3`
  font-size: 18px;
  margin: 0 0 16px 0;
  color: var(--text-primary);
  padding-right: 20px;
`;
```

Usage:
```jsx
{showTransferBox && (
  <FloatingTransferBox>
    <CloseButton onClick={handleCloseTransferBox}>×</CloseButton>
    <TransferBoxTitle>Transfer {token.name}</TransferBoxTitle>
    
    {/* Transfer content */}
  </FloatingTransferBox>
)}
```

Features:
- Fixed position on desktop, inline on mobile
- Close button for dismissing the panel
- Scrollable content for longer forms
- Visual distinction with border and shadow
- Contextual appearance based on user interaction

**Interaction & Feedback:**
- **Appearance/Disappearance:** Use smooth transitions (e.g., `opacity` and `transform: translateX(10px);` for slide-in effect from right on desktop).

### Tooltips / Modals / Toasts

- Modals: Centered, overlay, max width 480px
- Toasts: Top-right, dismissible after 5s
- Tooltips: Fade in on hover

### Token Tiles

Example:
```jsx
<TokenTile
  token={token}
  chainId={chainId}
  balance={balance}
  selected={isSelected}
  disabled={isDisabled}
  onClick={handleClick}
/>
```

**Interaction & Feedback:**
- **Hover State:** Subtle scale transform (`transform: scale(1.05);`) and potentially a slightly brighter border or background. Add smooth transitions.
- **Selected State:** Enhance visual distinction - e.g., thicker accent border, persistent background change, and/or a small checkmark icon overlay.

Variants:
- Default: Shows chain logo, name, and token balance
- Selected: Blue accent background and border
- Disabled: Grayed out, no hover state (for "Coming Soon" chains)

Layout:
- Grid-based display (min-width: 160px)
- Centered content with chain logo, name, and balance
- Hover effect with slight elevation
- Responsive grid layout (auto-fill)

### Token Sections

Example:
```jsx
<TokenSection>
  <TokenHeader>
    <TokenIcon />
    <TokenTitle>Token Name <TokenSymbol>SYMBOL</TokenSymbol></TokenTitle>
  </TokenHeader>
  <TokenGrid>
    {/* TokenTiles */}
  </TokenGrid>
</TokenSection>
```

Layout:
- Token icon and name header
- Grid of chain tiles below
- Clear visual hierarchy
- Consistent spacing (24px between sections)

### Enhanced Transfer Page Design

The Transfer page requires a more efficient and information-dense layout to improve usability, particularly when handling multiple tokens.

#### Compact Token Card

Replace large token tiles with a streamlined horizontal card format:

```jsx
const TokenCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  height: 72px;
  background-color: var(--card-bg);
  border-radius: 12px;
  border: 1px solid var(--border);
  margin-bottom: 12px;
  transition: all 0.2s ease;
  
  &:hover {
    transform: scale(1.02);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    border-color: var(--accent-primary-transparent);
  }
`;

const TokenInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const TokenIconWrapper = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.color || '#3C9DF2'};
`;

const TokenDetails = styled.div`
  display: flex;
  flex-direction: column;
`;

const TokenNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TokenName = styled.span`
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
`;

const TokenSymbol = styled.span`
  font-size: 14px;
  color: var(--text-secondary);
`;

const OwnerBadge = styled.span`
  font-size: 11px;
  font-weight: 500;
  color: var(--accent-secondary);
  background-color: rgba(0, 232, 181, 0.1);
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
`;

const ChainBadges = styled.div`
  display: flex;
  gap: 4px;
  margin-top: 4px;
`;

const ChainBadge = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background-color: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
`;

const TokenBalance = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: right;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const ActionButton = styled.button`
  background-color: ${props => props.primary ? 'var(--accent-primary)' : 'transparent'};
  color: ${props => props.primary ? 'white' : 'var(--text-primary)'};
  border: 1px solid ${props => props.primary ? 'var(--accent-primary)' : 'var(--border)'};
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background-color: ${props => props.primary ? 'var(--accent-primary)' : 'rgba(60, 157, 242, 0.1)'};
    transform: translateY(-1px);
  }
`;
```

Usage example:
```jsx
<TokenCard>
  <TokenInfo>
    <TokenIconWrapper>
      <TokenIcon />
    </TokenIconWrapper>
    <TokenDetails>
      <TokenNameRow>
        <TokenName>Universal Token</TokenName>
        <TokenSymbol>UTK</TokenSymbol>
        {isOwner && <OwnerBadge>OWNER</OwnerBadge>}
      </TokenNameRow>
      <ChainBadges>
        <ChainBadge>Z</ChainBadge>
        <ChainBadge>ETH</ChainBadge>
        <ChainBadge>BSC</ChainBadge>
      </ChainBadges>
    </TokenDetails>
  </TokenInfo>
  <TokenBalance>1,012 UTK</TokenBalance>
  <ActionButtons>
    <ActionButton primary>Transfer</ActionButton>
    {isOwner && <ActionButton>Mint</ActionButton>}
  </ActionButtons>
</TokenCard>
```

#### Token Section Containers

Organize tokens by ownership status:

```jsx
const TokenSectionHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  
  &::before {
    content: '';
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: ${props => props.isOwner ? 'var(--accent-secondary)' : 'var(--accent-primary)'};
    margin-right: 8px;
  }
`;

const TokenSectionTitle = styled.h3`
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const TokenSectionContainer = styled.div`
  margin-bottom: 32px;
`;
```

Usage:
```jsx
<TokenListContainer>
  {/* Filtering and sorting controls */}
  <FilterContainer>
    <TabsContainer>
      <TabButton active={filter === 'all'} onClick={() => setFilter('all')}>All Tokens</TabButton>
      <TabButton active={filter === 'owned'} onClick={() => setFilter('owned')}>Your Deployed</TabButton>
      <TabButton active={filter === 'holdings'} onClick={() => setFilter('holdings')}>Your Holdings</TabButton>
    </TabsContainer>
    <SearchContainer>
      <SearchInput placeholder="Search tokens..." />
    </SearchContainer>
    <SortContainer>
      <SortLabel>Sort by:</SortLabel>
      <SortSelect onChange={handleSortChange}>
        <option value="balance">Balance</option>
        <option value="name">Name</option>
        <option value="created_at">Newest First</option>
      </SortSelect>
    </SortContainer>
  </FilterContainer>
  
  {/* Owned tokens section */}
  {ownedTokens.length > 0 && (
    <TokenSectionContainer>
      <TokenSectionHeader isOwner>
        <TokenSectionTitle>Your Deployed Tokens</TokenSectionTitle>
      </TokenSectionHeader>
      {ownedTokens.map(token => (
        <TokenCard key={token.id} isOwner={true} {...token} />
      ))}
    </TokenSectionContainer>
  )}
  
  {/* Held tokens section */}
  {heldTokens.length > 0 && (
    <TokenSectionContainer>
      <TokenSectionHeader>
        <TokenSectionTitle>Your Token Holdings</TokenSectionTitle>
      </TokenSectionHeader>
      {heldTokens.map(token => (
        <TokenCard key={token.id} isOwner={false} {...token} />
      ))}
    </TokenSectionContainer>
  )}
</TokenListContainer>
```

#### Filter and Sort Components

Enable efficient token filtering and sorting:

```jsx
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
  
  &::before {
    content: '🔍';
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--text-secondary);
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
```

#### Refined Transfer Panel

Improve the floating transfer box for better UX:

```jsx
const EnhancedTransferBox = styled(FloatingTransferBox)`
  padding: 24px;
  
  /* Add additional styles for improved transfer panel */
  & > div {
    margin-bottom: 20px;
  }
`;

const SelectedTokenDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: rgba(60, 157, 242, 0.1);
  border-radius: 8px;
  margin-bottom: 20px;
`;

const TransferSteps = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 24px;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 12px;
    left: 24px;
    right: 24px;
    height: 2px;
    background-color: var(--border);
    z-index: 0;
  }
`;

const TransferStep = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  z-index: 1;
`;

const StepIndicator = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: ${props => props.active || props.completed ? 'var(--accent-primary)' : 'var(--card-bg)'};
  border: 2px solid ${props => props.completed ? 'var(--accent-secondary)' : props.active ? 'var(--accent-primary)' : 'var(--border)'};
  color: ${props => props.active || props.completed ? 'white' : 'var(--text-secondary)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
`;

const StepLabel = styled.span`
  font-size: 12px;
  color: ${props => props.active ? 'var(--text-primary)' : 'var(--text-secondary)'};
  font-weight: ${props => props.active ? 500 : 400};
`;

const QuickAmountButtons = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 8px;
`;

const QuickAmountButton = styled.button`
  background-color: rgba(60, 157, 242, 0.1);
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  color: var(--accent-primary);
  cursor: pointer;
  
  &:hover {
    background-color: rgba(60, 157, 242, 0.2);
  }
`;
```

Usage:
```jsx
<EnhancedTransferBox>
  <CloseButton onClick={handleCloseTransferBox}>×</CloseButton>
  <TransferBoxTitle>Transfer {token.name}</TransferBoxTitle>
  
  <SelectedTokenDisplay>
    <TokenIconWrapper>
      <TokenIcon />
    </TokenIconWrapper>
    <TokenDetails>
      <TokenName>{token.name}</TokenName>
      <TokenBalance>{formatAmount(token.balance)} {token.symbol}</TokenBalance>
    </TokenDetails>
  </SelectedTokenDisplay>
  
  <TransferSteps>
    <TransferStep>
      <StepIndicator active completed>1</StepIndicator>
      <StepLabel active>Source</StepLabel>
    </TransferStep>
    <TransferStep>
      <StepIndicator active>2</StepIndicator>
      <StepLabel active>Amount</StepLabel>
    </TransferStep>
    <TransferStep>
      <StepIndicator>3</StepIndicator>
      <StepLabel>Destination</StepLabel>
    </TransferStep>
  </TransferSteps>
  
  <FormGroup>
    <Label>Transfer Amount</Label>
    <Input 
      type="text" 
      value={amount} 
      onChange={handleAmountChange} 
      placeholder="Enter amount to transfer"
    />
    <QuickAmountButtons>
      <QuickAmountButton onClick={() => setQuickAmount(0.25)}>25%</QuickAmountButton>
      <QuickAmountButton onClick={() => setQuickAmount(0.5)}>50%</QuickAmountButton>
      <QuickAmountButton onClick={() => setQuickAmount(0.75)}>75%</QuickAmountButton>
      <QuickAmountButton onClick={() => setQuickAmount(1)}>MAX</QuickAmountButton>
    </QuickAmountButtons>
  </FormGroup>
  
  {/* Rest of transfer form */}
</EnhancedTransferBox>
```

These improvements create a more efficient, intuitive, and visually refined transfer experience that:
- Reduces vertical space usage with compact cards
- Clearly distinguishes between owned and held tokens
- Provides immediate access to important actions
- Enables efficient filtering, searching, and sorting (including by creation date)
- Improves the transfer flow with better visual guidance
- Adds micro-interactions for a more polished feel

**Interaction & Feedback:**
- All elements feature appropriate hover states, transitions, and selection indicators
- Card expansion for detailed information uses smooth height transitions
- Progress indication during transfers is clear and step-based
- Token selection provides immediate visual feedback

### Implementation Details

The Enhanced Transfer page implementation includes:

1. **EnhancedTokenCard Component:**
   - Horizontal card layout showing token icon, name, symbol, owner badge, and chain badges 
   - Total balance display across all chains
   - Direct access to Transfer button for all tokens
   - Mint button for tokens the user owns/deployed
   - Visual differentiation for owned vs. held tokens
   - Subtle hover animation with scale and shadow effects

2. **TokenSectionContainer Component:**
   - Groups tokens by ownership status
   - Uses colored dots (accent-secondary for owned, accent-primary for holdings) 
   - Uppercase section titles with consistent styling

3. **TokenFilterControls Component:**
   - Tab-based filtering for "All Tokens", "Tokens You Deployed", and "Tokens You Hold"
   - Search input with placeholder and icon
   - Dropdown for sorting options including balance, name, symbol, and creation date
   - Responsive layout that adapts to different screen sizes

4. **EnhancedTransferPanel Component:**
   - Step-based transfer process (Source → Amount → Destination)
   - Visual step indicators with progress tracking
   - Selected token display with balance
   - Quick amount buttons (25%, 50%, 75%, MAX)
   - Responsive grid layout for chain selection
   - Smooth animations for panel appearance/disappearance

5. **Data Flow Improvements:**
   - Added created_at field for token sorting by newest/oldest
   - Separate filtering for owned vs. held tokens
   - Search functionality across token names and symbols
   - Enhanced pagination for large token collections

These components work together to create a more efficient, intuitive, and polished transfer experience for users, reducing cognitive load while providing immediate access to common actions.

### Destination Chain Selection

Compact grid for selecting destination chains in the transfer interface:

```jsx
const DestinationChainGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 16px;
`;

const DestinationChainTile = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  border-radius: 8px;
  border: 2px solid ${props => props.selected ? 'var(--accent-primary)' : 'var(--border-color)'};
  background-color: ${props => props.selected ? 'var(--accent-primary-transparent)' : 'transparent'};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.5 : 1};
  transition: all 0.2s ease;
`;
```

Used within the floating transfer box to provide a compact selection interface.

### Pagination Controls

Used for navigating through multi-page content:

```jsx
const PaginationContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 24px;
  margin-bottom: 16px;
  gap: 16px;
`;

const PaginationButton = styled.button`
  background-color: ${props => props.active ? 'var(--accent-primary)' : 'transparent'};
  color: ${props => props.active ? 'white' : 'var(--text-primary)'};
  border: 1px solid ${props => props.active ? 'var(--accent-primary)' : 'var(--border-color)'};
  border-radius: 4px;
  padding: 8px 16px;
  font-size: 14px;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.5 : 1};
`;

const PageInfo = styled.span`
  display: flex;
  align-items: center;
  font-size: 14px;
  color: var(--text-secondary);
`;
```

Usage:
```jsx
<PaginationContainer>
  <PaginationButton 
    onClick={() => handlePageChange(currentPage - 1)}
    disabled={currentPage === 1}
  >
    Previous
  </PaginationButton>
  
  <PageInfo>
    Page {currentPage} of {totalPages}
  </PageInfo>
  
  <PaginationButton 
    onClick={() => handlePageChange(currentPage + 1)}
    disabled={currentPage === totalPages}
  >
    Next
  </PaginationButton>
</PaginationContainer>
```

### Process Steppers

Visualize multi-step processes like deployment or complex transfers.

**Structure:**
- Horizontal list of steps (e.g., Configure, Pay Fee, Confirm, Deploy).
- Each step has an icon, title, and status indicator (Pending, Active, Completed, Error).
- Connecting lines between steps show progress.
- Active step is highlighted. Completed steps show success indicator (e.g., checkmark). Error steps show error indicator.

```jsx
const StepperContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  position: relative;
  /* Add pseudo-element for connecting lines */
`;

const Step = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  flex: 1;
  position: relative;
  /* Style based on status (active, completed, error) */
`;

const StepIcon = styled.div` /* Circle with icon */ `;
const StepTitle = styled.div` /* Small text below icon */ `;
```

---

## 🔁 Interaction Patterns

| Event                  | Response                                   |
|------------------------|--------------------------------------------|
| Form error             | Shake field, red message below input       |
| Valid CSV Upload       | Badge: "97 entries valid. 3 errors."       |
| Fee Paid               | Transition to deployment progress panel    |
| Bridge in progress     | Live status: "Burning… Minting… ✅ Done"   |
| Token Selected         | Show floating transfer box                 |
| Destination Selected   | Reveal transfer amount and recipient fields |
| Button Hover/Click     | Subtle scale/brightness change, smooth transition.                         | Defined in Button component section.                         |
| Input Focus/Error      | Accent border + glow (focus), Red border + glow (error), smooth transition. | Defined in Input component section.                          |
| Form Validation Error  | Highlight specific field(s) with error style, show clear message nearby.   | Prefer inline messages near fields over generic toasts.      |
| Data Loading           | Use skeleton loaders for components, spinners for actions.                 | Avoid jarring layout shifts during loading.                  |
| Async Action Start     | Disable relevant controls, show inline spinner or progress indicator.      | E.g., Within the "Deploy" button or near status text.        |
| Async Action Success   | Show success message (e.g., Toast), update UI state smoothly.            | Use subtle animations for state changes if appropriate.      |
| Async Action Error     | Show clear error message (Toast or inline), allow user action (retry?).   | Provide option to view detailed error if useful.             |
| Multi-Step Process     | Update visual stepper component to reflect current step and status.        | Defined in Process Steppers section.                         |
| Panel Appearance       | Smooth transition (fade-in, slide-in).                                     | E.g., Floating Transfer Box.                                 |
| Token/Item Selection   | Clear visual change (border, background, icon), smooth transition.         | Defined in Token Tile section.                               |

---

## 📱 Responsive Breakpoints

| Breakpoint | Width Range     | Behavior                               |
|------------|------------------|----------------------------------------|
| Desktop    | >1200px          | Full layout, floating panels visible   |
| Tablet     | 768px–1200px     | Stacked form inputs, inline panels     |
| Mobile     | <768px           | Collapsed menus, single column layout  |

---

## 🧠 Accessibility Guidelines

- Use high-contrast colors for text/background
- All inputs and buttons must have aria-labels
- Enable full keyboard navigation for tab/enter
- Focus ring visible when tabbing through elements
- Ensure floating elements are properly dismissible
- Provide alternative interaction patterns for touch devices

---

## 🔍 Consistency Guidelines

1. **Layout Consistency**
   - All form sections must use the standard FormContainer component with 24px padding
   - Each form container should have exactly one SectionTitle with 24px margin-bottom
   - Maintain 32px spacing between form sections
   - Maintain 24px spacing between form rows

2. **Component Consistency**
   - Form inputs should be arranged in rows with two inputs per row where possible
   - All buttons should have the same height (48px) and similar padding (Primary: 14px 32px)
   - Fee sections should always use the blue-tinted background with consistent 24px padding
   - All toggle buttons should be 48px in height with 12px 24px padding

3. **Styling Consistency**
   - Only use colors from the defined palette
   - Maintain consistent border-radius (8px for buttons/inputs, 12px for containers)
   - Use the same blue accent color for all interactive elements
   - Apply 1px border with var(--border) color to all container elements
   - Form containers should have box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15)

4. **Content Structure**
   - Page titles should be centered, 32px font size, font-weight 700
   - Section titles should always be left-aligned, 24px font size, font-weight 600
   - Descriptions should use the --text-secondary color, 16px font size
   - Error messages should have consistent padding (16px) and background color (rgba(255, 82, 82, 0.1))

5. **Cross-Page Consistency**
   - Ensure the Create/Launch page and Transfer page use identical styling for common elements
   - Both pages should maintain the same padding, spacing, font sizes, and component dimensions
   - Element heights should be consistent across all pages (buttons: 48px, inputs: 48px, toggles: 48px)
   - Maintain consistent form element spacing (margin-bottom: 24px between rows)

6. **Contextual UI Elements**
   - Floating elements like the transfer box should follow consistent positioning and styling
   - Ensure responsive behavior is consistent across all contextual elements
   - Use the same interaction patterns for showing/hiding contextual elements

7. **Page Structure**
   - All primary pages should use `PageContainer` with max-width: 800px and padding: 40px 20px
   - Page titles should always use `PageTitle` component with text-align: center and margin-bottom: 32px
   - Content containers should use `FormContainer` with background-color: var(--card-bg), border-radius: 12px, and padding: 24px

---

## 🔮 Future Design Tokens (Optional)

- Light Mode Theme
- Chain Accent Overlays (e.g., ETH = #627EEA)
- Component Animations (e.g., pulse bridge progress)
- Drag and drop interactions for token transfers

---

<!-- Added New Feature Section: Automatic Source Chain Selection -->

### Automatic Source Chain Selection

When a user holds tokens on only one chain (i.e. only one chain has a non-zero token balance), the transfer panel automatically selects that chain as the source chain. This feature reduces the amount of manual input required by the user and streamlines the token transfer process.

<!-- End of New Feature Section -->