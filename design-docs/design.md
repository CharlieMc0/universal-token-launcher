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

---

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

---

### Cards & Containers

- Background: --card-bg
- Padding: 24px (consistent)
- Rounded corners: 12px
- Shadow: Subtle ambient glow (rgba(0, 232, 181, 0.1))

Container Types:
- FormContainer: Used for grouped form elements with section titles
- FeeInfo: Light blue background (rgba(60, 157, 242, 0.1)), 16px padding, 8px border radius

---

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

---

### Tooltips / Modals / Toasts

- Modals: Centered, overlay, max width 480px
- Toasts: Top-right, dismissible after 5s
- Tooltips: Fade in on hover

---

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

---

## 🔁 Interaction Patterns

| Event                  | Response                                   |
|------------------------|--------------------------------------------|
| Form error             | Shake field, red message below input       |
| Valid CSV Upload       | Badge: "97 entries valid. 3 errors."       |
| Fee Paid               | Transition to deployment progress panel    |
| Bridge in progress     | Live status: "Burning… Minting… ✅ Done"   |

---

## 📱 Responsive Breakpoints

| Breakpoint | Width Range     | Behavior                        |
|------------|------------------|----------------------------------|
| Desktop    | >1024px          | Full layout, sidebar visible    |
| Tablet     | 768px–1024px     | Stacked form inputs             |
| Mobile     | <768px           | Collapsed menus, single column  |

---

## 🧠 Accessibility Guidelines

- Use high-contrast colors for text/background
- All inputs and buttons must have aria-labels
- Enable full keyboard navigation for tab/enter
- Focus ring visible when tabbing through elements

---

## 🔍 Consistency Guidelines

1. **Layout Consistency**
   - All form sections must use the standard FormContainer component with 24px padding
   - Each form container should have exactly one SectionTitle
   - Maintain 32px spacing between form sections
   - Maintain 16px spacing between form rows

2. **Component Consistency**
   - Form inputs should be arranged in rows with two inputs per row where possible
   - All buttons should have the same height and similar padding (Primary: 14px 32px)
   - Fee sections should always use the blue-tinted background with consistent 16px padding

3. **Styling Consistency**
   - Only use colors from the defined palette
   - Maintain consistent border-radius (8px for buttons/inputs, 12px for containers)
   - Use the same blue accent color for all interactive elements

4. **Content Structure**
   - Page titles should be centered
   - Section titles should always be left-aligned
   - Descriptions should use the --text-secondary color
   - Error messages should be displayed in a consistent way across components

5. **Cross-Component Verification**
   - When adding new components or modifying existing ones, verify the styling against other similar components
   - If one component (e.g., Create Token) is modified, make the same changes to related components (e.g., Create NFT)

---

## 🔮 Future Design Tokens (Optional)

- Light Mode Theme
- Chain Accent Overlays (e.g., ETH = #627EEA)
- Component Animations (e.g., pulse bridge progress)

---