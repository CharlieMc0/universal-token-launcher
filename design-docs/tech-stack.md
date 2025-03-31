# Tech Stack Recommendation Document

This document outlines the recommended technologies for building the Universal Token Launcher, updated based on implementation experience.

---

## 1. Frontend Stack

- **Framework:** 
  - **React.js with Create React App**  
    *Rationale:* React provides a component-based architecture that simplifies development and maintenance. Create React App offers a pre-configured environment to start developing immediately without complex setup.

- **Wallet Integration:** 
  - **wagmi (v2.x)** + **ethers.js (v6.x)**  
    *Rationale:* wagmi is a React hooks library for Ethereum that simplifies wallet connections, reading/writing to contracts, and managing transactions. It works best alongside ethers.js for specialized Ethereum operations.
  
  - **@rainbow-me/rainbowkit**  
    *Rationale:* Provides pre-built UI components for wallet connection that integrate well with wagmi.

- **UI Libraries & Styling:** 
  - **CSS Modules** or **styled-components**  
    *Rationale:* For clean, component-scoped styling that prevents CSS conflicts.

- **API Integration:**
  - **Fetch API** (native browser API)  
    *Rationale:* Built into modern browsers, reducing dependencies while providing robust HTTP request functionality.

- **Form Handling:**
  - **Native React forms with controlled components**  
    *Rationale:* Simplifies form state management without additional dependencies.

---

## 2. Backend Stack

- **Language & Framework:** 
  - **Python with FastAPI**  
    *Rationale:* FastAPI offers high performance, asynchronous support, and automatic API documentation. Python's extensive ecosystem accelerates development.

- **API Structure:**
  - **Consistent endpoint naming and prefix strategy**
  - **Use a single prefix layer in router configuration**
    *Rationale:* Prevent duplicate prefixes that cause 404 errors. Either define the prefix in router creation OR in app inclusion, but not both.

- **CORS Configuration:**
  - **Explicit whitelist of allowed origins**
  - **Development mode with wildcard origin option**
    *Rationale:* Proper CORS configuration is critical for frontend-backend communication.

---

## 3. Database Layer

- **Primary Database:** 
  - **PostgreSQL**  
    *Rationale:* A reliable, ACID-compliant relational database for storing token configurations, deployment logs, and transaction data.

- **ORM:**
  - **SQLAlchemy**
    *Rationale:* Provides a Python interface for database operations with support for PostgreSQL.

- **Migration Tool:**
  - **Alembic**
    *Rationale:* Manages database schema changes and version control alongside SQLAlchemy.

---

## 4. Authentication & Authorization

- **Method:** 
  - **Web3 Wallet Authentication**  
    *Rationale:* Users authenticate by connecting their Web3 wallet with signature verification.

- **Implementation:**
  - **JWT tokens for session management**
  - **Optional authentication bypass for development**
    *Rationale:* For easier testing during development, ability to bypass wallet authentication with test wallet address.

---

## 5. API Design Considerations

- **Payload Format:**
  - **FormData for file uploads**
  - **JSON for standard requests**
  - **Consistent field naming across frontend/backend**
    *Rationale:* Field names in the frontend must match exactly what the backend expects (e.g., `token_name` vs `name`).

- **Error Handling:**
  - **Detailed error responses with status codes**
  - **Frontend error handling with specific error messages**
    *Rationale:* Proper error handling helps with debugging and provides better user experience.

- **Versioning Strategy:**
  - **API versioning in the URL path** (e.g., `/api/v1/tokens`)
  - **Ensure only one prefix layer is used** (avoid duplicate prefix issue)
    *Rationale:* Versioning allows for backward compatibility, but must be implemented consistently.

---

## 6. Blockchain Integration

- **Network Configuration:**
  - **Explicit chain configurations for all supported networks**
  - **Helper functions for network switching and RPC fallbacks**
    *Rationale:* Having full chain configuration details, including proper RPC endpoints, improves reliability.

- **Transaction Handling:**
  - **Use wagmi hooks for transactions** (`useSendTransaction`, `useContractWrite`)
  - **Proper error handling and confirmation tracking**
    *Rationale:* wagmi hooks manage transaction states and provide better error information.

- **Fee Payment:**
  - **Clear fee structure and verification**
  - **Explicit BigInt handling for value/fee parameters**
    *Rationale:* Smart contract interactions require proper value formatting to avoid errors.

---

## 7. Deployment Workflow

- **Frontend Deployment:**
  - **Vercel or Netlify for static hosting**
  - **Environment variables for API endpoints and network configuration**

- **Backend Deployment:**
  - **Docker containers for consistent environments**
  - **Environment variable management for sensitive configuration**
  - **Database migration strategy during deployment**

---

## 8. Implementation Gotchas and Solutions

- **CORS Issues:**
  - Configure CORS middleware in FastAPI with appropriate origins
  - For development, allow wildcard (`*`) origin with explicit configuration

- **API Endpoint Conflicts:**
  - Avoid duplicating route prefixes in both router definition and router inclusion
  - Use consistent naming scheme across the codebase

- **Transaction Handling:**
  - Don't convert BigInt values to strings when using wagmi hooks
  - Handle transaction errors explicitly and display meaningful messages

- **Authentication Flow:**
  - Include development mode for bypassing wallet authentication
  - Implement proper JWT storage and header inclusion

- **File Upload Handling:**
  - Use FormData correctly without setting Content-Type header
  - Process multipart form data correctly on the backend

---

## 9. Recommended Project Structure

### Frontend Structure
```
frontend/
├── public/
│   └── assets/             # Static assets like images
├── src/
│   ├── components/         # React components
│   │   ├── components/         # React components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── services/           # API services
│   │   │   └── apiService.js   # API integration
│   │   ├── styles/             # CSS/SCSS files
│   │   ├── utils/              # Utility functions
│   │   ├── App.js              # Main app component
│   │   └── index.js            # Entry point
│   └── package.json            # Dependencies
```

### Backend Structure
```
backend/
├── app/
│   ├── api/                # API routes
│   │   ├── auth.py
│   │   ├── tokens.py
│   │   └── ...
│   ├── core/               # Core functionality
│   │   ├── config.py       # Settings
│   │   └── ...
│   ├── db/                 # Database
│   │   ├── session.py
│   │   └── ...
│   ├── models/             # Data models
│   │   ├── token.py
│   │   └── ...
│   ├── services/           # Business logic
│   │   ├── token_service.py
│   │   └── ...
│   └── main.py             # Entry point
├── .env                    # Environment variables
└── requirements.txt        # Dependencies
```

This updated tech stack recommendation provides guidance based on real implementation experience with the Universal Token Launcher application.
