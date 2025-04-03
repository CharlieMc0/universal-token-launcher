# Tech Stack Document

This document outlines the key technologies used in the Universal Token Launcher project.

---

## 1. Frontend Stack

- **Framework:** React.js (likely with Create React App based on previous version).
  *Rationale:* Component-based architecture, large ecosystem.
- **Wallet Integration:** `wagmi` (v2.x) + `ethers.js` (v6.x).
  *Rationale:* wagmi provides React Hooks for wallet interaction, simplifying development. Ethers.js is the underlying library.
- **Wallet UI:** `@rainbow-me/rainbowkit` (or similar like web3modal, connectkit).
  *Rationale:* Pre-built, user-friendly wallet connection modals.
- **Styling:** CSS Modules or styled-components (or potentially Tailwind CSS for new build).
  *Rationale:* Component-scoped styling for maintainability.
- **API Communication:** Browser `fetch` API or libraries like `axios`.
  *Rationale:* Standard methods for interacting with the backend REST API.

---

## 2. Backend Stack

- **Language:** Python **3.11 (Required)**.
  *Rationale:* Modern Python features, strong ecosystem for web development and data handling.
- **Framework:** FastAPI.
  *Rationale:* High-performance ASGI framework, automatic data validation (Pydantic) and API documentation (Swagger UI).
- **Web Server:** Uvicorn.
  *Rationale:* Standard ASGI server for running FastAPI applications.
- **Blockchain Interaction:** `web3.py` (v6+).
  *Rationale:* Standard Python library for interacting with Ethereum-compatible blockchains.
- **HTTP Client (for external calls):** `httpx`.
  *Rationale:* Modern, async-compatible HTTP client used for interacting with external APIs like block explorers.

---

## 3. Database Layer

- **Database:** PostgreSQL.
  *Rationale:* Robust, open-source relational database with strong JSONB support.
- **ORM:** SQLAlchemy.
  *Rationale:* De facto standard Python ORM, flexible and powerful.
- **Migrations:** Alembic.
  *Rationale:* Standard migration tool for SQLAlchemy, tightly integrated.

---

## 4. Smart Contracts

- **Language:** Solidity (version >=0.8.x).
  *Rationale:* Standard language for EVM-compatible smart contracts.
- **Development Framework:** Hardhat.
  *Rationale:* Comprehensive environment for compiling, testing, deploying, and debugging Solidity contracts.
- **Interaction Library (Scripting):** Ethers.js (v6.x) used within Hardhat tasks/scripts.
  *Rationale:* Consistent library used across frontend and backend scripting for blockchain interaction.

---

## 5. Deployment & Infrastructure

- **Containerization:** Docker.
  *Rationale:* Ensures consistent environments for development and deployment.
- **Potential Hosting:** Cloud platforms like Google Cloud (Cloud Run, GKE), AWS (ECS, EKS), Vercel (Frontend), Netlify (Frontend).
  *Rationale:* Scalable and managed infrastructure options.

---

*(Refer to `backend/README.md` and `documentation/backend-structure.md` for architectural details, setup instructions, and implementation notes.)*
