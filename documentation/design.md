# 🎨 Universal Launcher – Design Language & UI System

## ✨ Visual Identity

### Tone & Style
- Visual Tone: Futuristic, clean, minimal, premium
- Mood: Confident, efficient, next-gen, intuitive
- Audience: Web3-native users, builders, and token creators

---

## 🎨 Color Palette

| Token             | Color     | Use Cases                              |
|------------------|-----------|----------------------------------------|
| --bg-primary      | #080810   | App background (darker than before)    |
| --bg-secondary    | #101018   | Secondary backgrounds, cards           |
| --accent-primary  | #4A9FFF   | Primary CTA buttons, links             |
| --accent-secondary| #00F0C0   | Success states, active indicators      |
| --accent-tertiary | #9D5CFF   | Highlight states, attention elements   |
| --text-primary    | #FFFFFF   | Main body text                         |
| --text-secondary  | #B0B0B0   | Placeholder/Muted text                 |
| --error           | #FF5252   | Validation errors, alerts              |
| --card-bg         | #12121A   | Cards, panels, modals background       |
| --border          | #282830   | Input borders, section dividers        |
| --border-light    | rgba(255, 255, 255, 0.08) | Thin dividers, subtle separators |
| --gradient-primary| linear-gradient(135deg, #4A9FFF 0%, #9D5CFF 100%) | Primary action buttons |
| --gradient-success| linear-gradient(135deg, #00F0C0 0%, #4A9FFF 100%) | Success states, completion indicators |

---

## 🖋 Typography

### Font Stack
- Primary: Inter, sans-serif
- Monospace: JetBrains Mono, Consolas, monospace (for addresses, hashes, amounts)
- Fallbacks: SF Pro, Satoshi, Helvetica Neue

### Sizing Scale

| Element           | Font Size | Weight |
|------------------|-----------|--------|
| H1 (Page Title)   | 32px      | 700    |
| H2 (Section)      | 24px      | 600    |
| Body Text         | 16px      | 400    |
| Caption / Label   | 13px      | 500    |
| Monospace Text    | 14px      | 400    |

---

## 📐 Spacing & Layout

- Grid: 8px spacing system (8px, 16px, 24px, 32px, 40px, 48px, 56px, 64px)
- Container Max Width: 1200px (main), 1100px (content), 800px (forms)
- Section Padding: 24px or 48px depending on screen size
- Form Container Padding: 24px (consistent across all form sections)
- Card Padding: 16px or 24px
- Border Radius: 8px for buttons, 12px for containers/cards
- Dividers: 1px with opacity 0.08

### Component Spacing
- Margin between form sections: 32px
- Margin between form rows: 16px
- Gap between form inputs in a row: 16px
- Section title margin-bottom: 16px

### Animations & Transitions
- Standard Transition: 250ms cubic-bezier(0.4, 0, 0.2, 1)
- Button Hover: transform: scale(1.03) over 250ms
- Button Active: transform: scale(0.98) over 150ms
- Page Transitions: 300ms fade-in
- Modal/Panel Entrances: 300ms combined scale and fade
- Loading States: Subtle pulse animation (opacity 0.7 to 1) over 1.5s

---

## 🧩 Component Library

### Navigation

#### Main Navigation
The main navigation should be minimal with just two primary actions:
```jsx
const MainNav = styled.nav`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0 auto;
  padding: 8px;
  background: rgba(18, 18, 26, 0.7);
  backdrop-filter: blur(8px);
  border-radius: 12px;
  border: 1px solid var(--border);
`;

const NavAction = styled.button`
  background: ${props => props.active ? 'var(--card-bg)' : 'transparent'};
  color: ${props => props.active ? 'var(--text-primary)' : 'var(--text-secondary)'};
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    background: ${props => props.active ? 'var(--card-bg)' : 'rgba(255, 255, 255, 0.05)'};
    transform: translateY(-1px);
  }
`;
```

Usage:
```jsx
<MainNav>
  <NavAction active={currentPage === 'make'} onClick={() => navigate('/make')}>Make</NavAction>
  <NavAction active={currentPage === 'move'} onClick={() => navigate('/move')}>Move</NavAction>
</MainNav>
```

#### Header Area
```jsx
const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: transparent;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
`;

const ConnectWallet = styled.div`
  /* Wallet connection button */
`;
```

### Page Structure

#### Page Containers
All main pages should use the following structure:
```jsx
const PageContainer = styled.div`
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 24px;
`;

const PageTitle = styled.h1`
  margin-bottom: 16px;
  text-align: center;
  font-size: 32px;
  font-weight: 700;
`;

const PageDescription = styled.p`
  text-align: center;
  color: var(--text-secondary);
  margin-bottom: 40px;
  max-width: 640px;
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
  border: 1px solid var(--border);
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
  }
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
<button class="btn-primary">Make Token</button>

Variants:
- Primary: Gradient background, white text, padding: 14px 32px
- Secondary: Transparent with gradient border
- Disabled: Grayed out, no hover state
- Toggle: Used for tab-like functionality, rounded edges when used in pairs

Button Styles:
```jsx
const Button = styled.button`
  padding: 14px 32px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 16px;
  border: none;
  cursor: pointer;
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    transform: scale(1.03);
  }
  
  &:active {
    transform: scale(0.98);
  }
`;

const PrimaryButton = styled(Button)`
  background: var(--gradient-primary);
  color: white;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(74, 159, 255, 0.3);
  }
`;

const SecondaryButton = styled(Button)`
  background: transparent;
  color: var(--text-primary);
  border: 1px solid var(--border);
  
  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`;
```

Button Container:
```jsx
const ButtonContainer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 32px;
  gap: 16px;
`;
```

**Interaction & Feedback:**
- **Hover State:** Scale transform (`transform: scale(1.03);`) with box-shadow for primary buttons
- **Active State:** Slightly smaller scale (`transform: scale(0.98);`)
- **Transitions:** Apply smooth transitions (`transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);`)

### Inputs

Example:
<input type="text" placeholder="Token Name" class="input-lg" />

Input Sizes:
- Small: 8px padding, 13px font
- Medium: 12px padding, 16px font
- Large: 16px padding, 18px font

Styles:
```jsx
const Input = styled.input`
  background-color: rgba(18, 18, 26, 0.8);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 16px;
  color: var(--text-primary);
  font-size: 16px;
  width: 100%;
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
  
  &:focus {
    border-color: var(--accent-primary);
    box-shadow: 0 0 0 3px rgba(74, 159, 255, 0.2);
    outline: none;
  }
  
  &.error {
    border-color: var(--error);
    box-shadow: 0 0 0 3px rgba(255, 82, 82, 0.2);
  }
  
  &::placeholder {
    color: var(--text-secondary);
  }
`;

const AddressInput = styled(Input)`
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 14px;
  letter-spacing: -0.02em;
`;

const AmountInput = styled(Input)`
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 14px;
  text-align: right;
`;
```

**Interaction & Feedback:**
- **Focus State:** Accent border color with subtle glow shadow
- **Error State:** Red border with subtle red glow
- **Disabled/Read-Only:** Reduced opacity (0.6) with cursor: not-allowed

### Cards & Containers

- Background: --card-bg
- Padding: 24px (consistent)
- Rounded corners: 12px
- Border: 1px solid var(--border)
- Shadow: Subtle ambient glow on hover

Container Types:
```jsx
const Card = styled.div`
  background-color: var(--card-bg);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid var(--border);
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.15);
  }
`;

const FeeInfo = styled(Card)`
  background-color: rgba(74, 159, 255, 0.1);
  border-color: rgba(74, 159, 255, 0.2);
`;

const SuccessCard = styled(Card)`
  background-color: rgba(0, 240, 192, 0.1);
  border-color: rgba(0, 240, 192, 0.2);
`;

const ErrorCard = styled(Card)`
  background-color: rgba(255, 82, 82, 0.1);
  border-color: rgba(255, 82, 82, 0.2);
`;

const Divider = styled.hr`
  border: 0;
  height: 1px;
  background-color: var(--border-light);
  margin: 16px 0;
`;
```

### Asset Type Selection

Replace toggle buttons with visual cards:

```jsx
const AssetTypeContainer = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 32px;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const AssetTypeCard = styled.div`
  flex: 1;
  background-color: ${props => props.selected ? 'rgba(74, 159, 255, 0.1)' : 'var(--card-bg)'};
  border: 2px solid ${props => props.selected ? 'var(--accent-primary)' : 'var(--border)'};
  border-radius: 12px;
  padding: 24px;
  cursor: pointer;
  text-align: center;
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    transform: ${props => props.selected ? 'none' : 'translateY(-4px)'};
    box-shadow: ${props => props.selected ? 'none' : '0 8px 24px rgba(0, 0, 0, 0.15)'};
  }
`;

const AssetTypeIcon = styled.div`
  width: 48px;
  height: 48px;
  margin: 0 auto 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.selected ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 50%;
  color: ${props => props.selected ? '#fff' : 'var(--text-primary)'};
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
`;

const AssetTypeTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
`;

const AssetTypeDescription = styled.p`
  font-size: 14px;
  color: var(--text-secondary);
`;
```

Usage:
```jsx
<AssetTypeContainer>
  <AssetTypeCard 
    selected={assetType === 'token'} 
    onClick={() => setAssetType('token')}
  >
    <AssetTypeIcon selected={assetType === 'token'}>
      <TokenIcon />
    </AssetTypeIcon>
    <AssetTypeTitle>Make a Token</AssetTypeTitle>
    <AssetTypeDescription>
      Create your own token that works across multiple blockchains
    </AssetTypeDescription>
  </AssetTypeCard>
  
  <AssetTypeCard 
    selected={assetType === 'nft'} 
    onClick={() => setAssetType('nft')}
  >
    <AssetTypeIcon selected={assetType === 'nft'}>
      <NFTIcon />
    </AssetTypeIcon>
    <AssetTypeTitle>Make an NFT Collection</AssetTypeTitle>
    <AssetTypeDescription>
      Create unique digital collectibles that can move between chains
    </AssetTypeDescription>
  </AssetTypeCard>
</AssetTypeContainer>
```

### Monospace Text Elements

For displaying addresses, transaction hashes, and amounts:

```jsx
const Address = styled.span`
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 14px;
  letter-spacing: -0.02em;
  background-color: rgba(255, 255, 255, 0.05);
  padding: 4px 8px;
  border-radius: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Hash = styled(Address)`
  color: var(--accent-primary);
`;

const Amount = styled.span`
  font-family: 'JetBrains Mono', Consolas, monospace;
  font-size: 14px;
  font-weight: 500;
`;
```

### Floating Move Box

Used for contextual move operations that appear when a token is selected:

```jsx
const FloatingMoveBox = styled.div`
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 360px;
  max-width: calc(100vw - 48px);
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.24);
  z-index: 100;
  
  @media (max-width: 768px) {
    width: 100%;
    right: 0;
    bottom: 0;
    border-radius: 12px 12px 0 0;
  }
`;

const MoveBoxTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 16px;
  color: var(--text-primary);
`;

{showMoveBox && (
  <Fade
    in={showMoveBox}
    timeout={200}
    unmountOnExit
  >
    <FloatingMoveBox>
      <CloseButton onClick={handleCloseMoveBox}>×</CloseButton>
      <MoveBoxTitle>Move {token.name}</MoveBoxTitle>
      {/* Move content */}
    </FloatingMoveBox>
  </Fade>
)}
```

### State Management

| State               | Action                                    |
|--------------------|------------------------------------------|
| Initial Load       | Show loading skeleton                     |
| Token Selected     | Show floating move box                   |
| Destination Selected| Reveal move amount and recipient fields |
| Loading            | Show progress spinner                     |
| Error              | Display error message                     |
| Success            | Show confirmation and clear form          |

### Design Guidelines

- Floating elements like the move box should follow consistent positioning and styling
- Use 8pt grid system for all spacing and sizing
- Use "Move" instead of "Transfer" or "Bridge" throughout the application
- Maintain consistent typography and color usage
- Ensure all interactive elements have hover and active states
- Support both light and dark themes
- Consider drag and drop interactions for token moves

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
| Button Hover/Click     | Scale transform with smooth transition (250ms)  |
| Input Focus/Error      | Accent border + glow (focus), Red border + glow (error) |
| Form Validation Error  | Highlight specific fields with error style |
| Data Loading           | Skeleton loaders with subtle pulse animation |
| Async Action Start     | Disable controls, show inline spinner |
| Async Action Success   | Success animation with subtle scale/fade |
| Async Action Error     | Error message with clear recovery options |
| Multi-Step Process     | Update visual stepper with smooth transitions |
| Panel Appearance       | 300ms fade/scale transition |
| Token/Item Selection   | Clear visual change with feedback animation |

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
   - Each form container should have exactly one SectionTitle with 16px margin-bottom
   - Maintain 32px spacing between form sections
   - Maintain 24px spacing between form rows

2. **Component Consistency**
   - Form inputs should be arranged in rows with two inputs per row where possible
   - All buttons should have the same height (48px) and similar padding
   - Fee sections should always use the blue-tinted background with consistent 24px padding
   - Consistent spacing using the 8px grid system

3. **Styling Consistency**
   - Only use colors from the defined palette
   - Maintain consistent border-radius (8px for buttons/inputs, 12px for containers)
   - Use gradient backgrounds for primary action buttons
   - Apply 1px border with var(--border) color to all container elements
   - Use thin dividers (1px) with var(--border-light) for subtle separation

4. **Content Structure**
   - Page titles should be centered, 32px font size, font-weight 700
   - Section titles should always be left-aligned, 24px font size, font-weight 600
   - Descriptions should use the --text-secondary color, 16px font size
   - Error messages should have consistent styling with clear recovery actions

5. **Cross-Page Consistency**
   - Ensure the Make and Move pages use identical styling for common elements
   - Both pages should maintain the same padding, spacing, font sizes, and component dimensions
   - Element heights should be consistent across all pages
   - Maintain consistent form element spacing using the 8px grid system

6. **Contextual UI Elements**
   - Floating elements like the transfer box should follow consistent positioning and styling
   - Ensure responsive behavior is consistent across all contextual elements
   - Use the same interaction patterns and animations for showing/hiding contextual elements

7. **Terminology Consistency**
   - Use "Make" instead of "Create" or "Launch" throughout the application
   - Use "Move" instead of "Transfer" or "Bridge" throughout the application
   - Use action-oriented language in all buttons and calls-to-action

---

## 🔮 Future Design Considerations

- Light Mode Theme
- Chain Accent Overlays (e.g., ETH = #627EEA)
- Advanced component animations
- Drag and drop interactions for token transfers
- Interactive visualization of cross-chain token movements