```markdown
# Universal Token Launcher – Step-by-Step Implementation Plan

This plan details the steps, deliverables, and checkpoints to build the Universal Token Launcher. It is designed for an AI coding agent (or development team) using Cursor IDE and similar tools to ensure clarity and consistency throughout the project. This updated plan reflects the recent changes where all references to “bridging” have been replaced with “transfers,” highlighting that Universal Tokens are used for cross-chain token transfers (burn on the source chain and mint on the destination chain).

---

## Stage 1: Project Setup

### Goal of the Step
Initialize the project repository and set up the basic folder structure, environment configuration, and required frameworks for both frontend and backend.

### Tasks to Complete
1. **Folder Structure Setup:**
   - Create a top-level structure with `/frontend` and `/backend` directories.
   - Within `/frontend`, set up folders for assets (images, styles) and scripts.
   - Within `/backend`, create folders for API (routes/controllers), core (config, database, authentication), services (business logic), and tests.
2. **Environment Configuration:**
   - Set up virtual environments (e.g., Python’s `venv` or Poetry) for the backend.
   - Create a configuration file (e.g., `config.py` or an environment variables file `.env`) to hold secrets and DB connection strings.
3. **Framework Installation:**
   - **Backend:** Install FastAPI, SQLAlchemy, Pydantic, Uvicorn, and other dependencies.
   - **Frontend:** Set up basic HTML, CSS (Tailwind CSS if chosen), and include ethers.js.
4. **Initial Commit & Documentation:**
   - Document the setup process in the README.md.

### Dependencies
- None (this is the initial setup).

### AI Instructions
- Generate initial repository files with clear folder structures.
- Use default .gitignore files for Python and Node/JS as applicable.
- Ensure all environment variables are clearly documented in a sample file (e.g., `.env.example`).

---

## Stage 2: Backend Development

### Goal of the Step
Develop the backend core functionality including authentication, database models, API endpoints, and business logic for token deployment and cross-chain token transfers.

### Tasks to Complete

#### 2.1. Database Models & Schema
- **Define Database Tables (PostgreSQL):**
  - Create models for `Token_Configurations`, `Token_Distributions`, `Deployment_Logs`, and `Transfer_Transactions`.
  - Specify fields with correct data types (e.g., SERIAL, VARCHAR, TEXT, NUMERIC, TIMESTAMP).
  - Set up relationships and foreign key constraints (e.g., `token_config_id` in distributions referencing configurations).
- **Implementation Tasks:**
  - Use SQLAlchemy (or a similar ORM) to define models.
  - Create migration scripts if using Alembic.

#### 2.2. Authentication & Authorization
- **Web3 Wallet Authentication:**
  - Implement endpoints that prompt the user to sign a nonce.
  - Validate signatures using ethers.js (frontend) and verify on the backend.
  - Generate a JWT containing the wallet address and expiration.
- **Implementation Tasks:**
  - Create an authentication module in `/backend/app/core/auth.py`.
  - Define Pydantic models for auth requests and responses.
  - Configure JWT token generation and validation.

#### 2.3. API Endpoints
- **Token Configuration & Deployment:**
  - **POST /api/tokens:** Accept token details and CSV file metadata.
  - **GET /api/tokens/{id}:** Retrieve configuration details and deployment status.
  - **POST /api/tokens/{id}/deploy:** Trigger contract deployment and token distribution.
- **Token Transfer Transactions:**
  - **POST /api/transfer:** Initiate a token transfer action (burn on the source chain and mint on the destination chain).
  - **GET /api/transfer/{id}:** Check the status of a token transfer transaction.
- **Status Updates:**
  - **GET /api/status:** Endpoint to poll or subscribe for real-time updates.
- **Implementation Tasks:**
  - Create route files in `/backend/app/api/` for tokens, transfers, and status.
  - Use FastAPI’s dependency injection and Pydantic for request validation.

#### 2.4. Business Logic & Services
- **Deployment Service:**
  - Write services for fee verification, contract deployment using ZetaChain Standard Contracts, and token distribution.
- **Transfer Service:**
  - Develop logic to handle token transfers (burn on one chain, mint on another).
- **Implementation Tasks:**
  - Create service modules in `/backend/app/services/` (e.g., `deployer.py` and `transfer_service.py`).
  - Ensure business logic is isolated from API routing code.

#### 2.5. Asynchronous Task Handling
- **Optional for Long Operations:**
  - Integrate Celery with Redis to offload blockchain interactions and deployment tasks.
- **Implementation Tasks:**
  - Set up Celery tasks and configure the Redis connection.

### Dependencies
- Stage 1 (Project Setup) must be completed.
- Database connection settings must be configured.

### AI Instructions
- Generate detailed SQLAlchemy models based on the database design.
- Ensure clear separation between API endpoints and service logic.
- Document all functions with docstrings to explain non-obvious logic.

---

## Stage 3: Frontend Development

### Goal of the Step
Build a simple, responsive user interface using HTML, CSS, and vanilla JavaScript for wallet connection, token configuration, and token transfer actions.

### Tasks to Complete

#### 3.1. UI Components & Pages
- **Landing / Onboarding Page:**
  - Create an HTML page with a “Connect Wallet” button.
  - Include minimal descriptive text about the app.
- **Token Creator Dashboard:**
  - Build an HTML form for token details (name, icon upload, decimals, total supply).
  - Add CSV file upload input and chain selection dropdown.
  - Display fee information and a “Deploy Token” button.
- **Token Holder Dashboard:**
  - Create a page that lists token balances and includes a “Transfer Tokens” button.
- **Implementation Tasks:**
  - Develop separate HTML files (or a single-page app with dynamic content updates).
  - Use Tailwind CSS or a simple CSS framework for styling.

#### 3.2. Wallet Integration
- **Implement Wallet Connection:**
  - Use ethers.js in vanilla JavaScript to prompt connection (e.g., MetaMask).
  - Display the connected wallet address and check for ZETA balance.
- **Implementation Tasks:**
  - Write a `wallet.js` utility that handles wallet connection, balance checks, and signature prompts.

#### 3.3. State Management & API Calls
- **Implement Basic State Handling:**
  - Use JavaScript modules to manage application state (e.g., current user, token configuration data).
- **API Integration:**
  - Write helper functions (e.g., in `api.js`) to call backend endpoints.
- **Implementation Tasks:**
  - Ensure robust error handling in API calls with user notifications.

### Dependencies
- Completion of backend API endpoints for integration.
- Basic UI/UX design mockups (even if minimal).

### AI Instructions
- Generate clean, modular JavaScript files that avoid global namespace pollution.
- Use comments to document function purposes and API interactions.

---

## Stage 4: Integration Layer

### Goal of the Step
Connect the frontend and backend by integrating API calls, validating inputs, and handling errors.

### Tasks to Complete
1. **API Connection:**
   - Integrate API helper functions in JavaScript to call backend endpoints for token configuration, deployment, and token transfers.
2. **Validation & Error Handling:**
   - Implement frontend form validations (e.g., CSV format, required fields).
   - Display error messages from backend responses.
3. **Real-Time Updates:**
   - Optionally set up polling or WebSocket connections to receive deployment and transfer status updates.
4. **Testing Integration:**
   - Test end-to-end flows: wallet connection → token configuration → fee payment → deployment → token transfer.

### Dependencies
- Backend endpoints must be operational.
- Frontend components must be implemented.

### AI Instructions
- Ensure that API calls include proper error handling (using try/catch or promise error callbacks).
- Document integration points with inline comments to aid debugging.

---

## Stage 5: Storage & Media Handling

### Goal of the Step
Set up secure file storage for CSV uploads and token icon images.

### Tasks to Complete
1. **Storage Provider Setup:**
   - Configure AWS S3 buckets (or a similar service) for:
     - `/uploads/csv/` – Private folder for CSV files.
     - `/uploads/icons/` – Public folder for token icons.
2. **Integration in Backend:**
   - Implement endpoints or service functions for file uploads.
   - Generate signed URLs for secure CSV access if needed.
3. **Frontend Integration:**
   - Update the token configuration form to upload CSV and icon files to the storage provider.
4. **Access Control:**
   - Define S3 bucket policies to restrict write access and enable public read for icons.

### Dependencies
- Account setup with AWS S3 or an equivalent storage provider.
- Environment variables must store credentials securely.

### AI Instructions
- Generate sample code for S3 file uploads using Python’s boto3 library.
- Include clear comments on folder structure and access control configuration.

---

## Stage 6: Testing

### Goal of the Step
Ensure robust code quality through unit, integration, and end-to-end tests.

### Tasks to Complete
1. **Backend Testing:**
   - Write unit tests for database models, service functions, and API endpoints using pytest.
   - Create integration tests to simulate end-to-end API calls.
   - Achieve at least 80% code coverage.
2. **Frontend Testing:**
   - Write unit tests for utility functions in JavaScript (e.g., using a lightweight framework like Jest if necessary).
   - Optionally, create manual integration tests to verify user flows.
3. **Test Organization:**
   - Place backend tests in `/backend/tests/` and frontend tests in `/frontend/tests/`.

### Dependencies
- Complete implementation of API endpoints and frontend utilities.

### AI Instructions
- Generate sample pytest test cases for each API endpoint.
- Document test expectations in comments and ensure tests are modular.

---

## Stage 7: Deployment

### Goal of the Step
Set up automated deployment pipelines and deploy the application to staging/production environments.

### Tasks to Complete
1. **CI/CD Setup:**
   - Configure GitHub Actions (or a similar system) to run tests, lint code, and build Docker images.
2. **Containerization:**
   - Create Dockerfiles for the backend (and optionally for the frontend if needed).
3. **Hosting & Environment:**
   - Deploy the backend on a scalable service (e.g., GCP, Render, or similar).
   - Deploy the static frontend on Vercel or Netlify.
   - Configure environment variables, domain names, and SSL certificates.
4. **Monitoring & Logging:**
   - Set up Prometheus/Grafana and Sentry for real-time monitoring and error tracking.
   - Configure logging in FastAPI and container logs.

### Dependencies
- Completed testing and stable builds.
- Docker and hosting account setup.

### AI Instructions
- Generate Dockerfiles and CI/CD configuration files.
- Include clear documentation on environment variables and deployment steps.

---

## Stage 8: Post-Launch Tasks

### Goal of the Step
Implement logging, analytics, and monitoring, and plan for iterative improvements based on user feedback.

### Tasks to Complete
1. **Logging & Analytics:**
   - Integrate centralized logging (e.g., ELK stack) and error reporting (Sentry).
   - Set up analytics (e.g., Google Analytics) on the frontend.
2. **User Feedback & Monitoring:**
   - Monitor API usage, performance, and error rates.
   - Plan for periodic reviews and updates to improve UI/UX and system performance.
3. **Documentation:**
   - Update README.md and developer docs to reflect deployment details and usage instructions.
4. **Iterative Improvements:**
   - Collect user feedback and plan for new features and enhancements.

### Dependencies
- Application must be live and operational in production.
- Monitoring tools must be integrated and configured.

### AI Instructions
- Generate documentation updates and provide clear instructions for adding new tests or features.
- Use inline comments to describe logging and analytics configuration.

---

## Summary

This updated implementation plan outlines all stages required to build the Universal Token Launcher with a focus on cross-chain token transfers (burning on the source chain and minting on the destination chain):
1. **Project Setup:** Establish repository and folder structures.
2. **Backend Development:** Build authentication, database models, API endpoints, and business logic for token deployment and transfers.
3. **Frontend Development:** Create HTML/CSS/JS UI components and wallet integration.
4. **Integration:** Connect frontend and backend with robust error handling.
5. **Storage & Media Handling:** Configure secure file storage.
6. **Testing:** Write comprehensive unit, integration, and end-to-end tests.
7. **Deployment:** Set up CI/CD pipelines, containerize, and deploy to staging/production.
8. **Post-Launch:** Implement logging, analytics, monitoring, and plan for continuous improvements.

Following this step-by-step plan, an AI coding agent or development team can efficiently build the Universal Token Launcher that emphasizes seamless cross-chain token transfers.
```