# Backend Structure Document

This document outlines the foundational backend system for the Universal Token Launcher. It details the database architecture, authentication and authorization, file storage, API design, data security, and strategies for scalability and modularity.

---

## 1. Database Architecture

We will use **PostgreSQL** as our primary relational database. Data is normalized to avoid redundancy, with separate tables for token configurations, distribution records, deployment logs, and bridge transactions. Key tables include:

### 1.1. Users (Optional)
*Purpose:* Store minimal user metadata if needed (wallet addresses).
- **Fields:**
  - `wallet_address` (TEXT, PRIMARY KEY, UNIQUE) – The user's wallet address.
  - `created_at` (TIMESTAMP WITH TIME ZONE, default NOW())
  - `updated_at` (TIMESTAMP WITH TIME ZONE)
- **Notes:** 
  - This table is optional since authentication is via wallet connection.
  - Use this table to store user preferences or history if required later.

### 1.2. Token_Configurations
*Purpose:* Record each token deployment configuration initiated by a token creator.
- **Fields:**
  - `id` (SERIAL, PRIMARY KEY)
  - `creator_wallet` (TEXT, NOT NULL) – The wallet address of the token creator.
  - `token_name` (VARCHAR, NOT NULL)
  - `icon_url` (TEXT) – URL or file path for the token’s icon.
  - `decimals` (INTEGER, NOT NULL)
  - `total_supply` (NUMERIC, NOT NULL)
  - `csv_data` (JSONB) – Raw or parsed CSV data for distribution; alternatively, use a separate table.
  - `fee_paid_tx` (VARCHAR) – Transaction hash of the fee payment.
  - `deployment_status` (VARCHAR) – e.g., 'pending', 'success', 'failure'.
  - `created_at` (TIMESTAMP WITH TIME ZONE, default NOW())
  - `updated_at` (TIMESTAMP WITH TIME ZONE)
- **Indexes & Constraints:**
  - Index on `creator_wallet` for quick lookup.
  - Constraint on `deployment_status` values (if using ENUM type, or check constraint).

### 1.3. Token_Distributions
*Purpose:* Store individual CSV entries for token distributions.
- **Fields:**
  - `id` (SERIAL, PRIMARY KEY)
  - `token_config_id` (INTEGER, NOT NULL) – Foreign key referencing `Token_Configurations(id)`.
  - `recipient_address` (TEXT, NOT NULL)
  - `chain_id` (VARCHAR, NOT NULL) – Identifier of the target chain.
  - `token_amount` (NUMERIC, NOT NULL)
  - `status` (VARCHAR) – e.g., 'pending', 'distributed', 'failed'.
  - `transaction_hash` (VARCHAR) – Blockchain transaction hash (if available).
  - `created_at` (TIMESTAMP WITH TIME ZONE, default NOW())
  - `updated_at` (TIMESTAMP WITH TIME ZONE)
- **Indexes & Constraints:**
  - Foreign key on `token_config_id` (with ON DELETE CASCADE).
  - Unique composite index on (`token_config_id`, `recipient_address`, `chain_id`) to avoid duplicate entries.

### 1.4. Deployment_Logs
*Purpose:* Log the status of contract deployments on each selected chain.
- **Fields:**
  - `id` (SERIAL, PRIMARY KEY)
  - `token_config_id` (INTEGER, NOT NULL) – Foreign key referencing `Token_Configurations(id)`.
  - `chain_name` (VARCHAR, NOT NULL) – E.g., 'Ethereum', 'Polygon'.
  - `contract_address` (TEXT) – Deployed contract address.
  - `status` (VARCHAR) – e.g., 'pending', 'success', 'failure'.
  - `error_message` (TEXT) – Detailed error if deployment fails.
  - `created_at` (TIMESTAMP WITH TIME ZONE, default NOW())
  - `updated_at` (TIMESTAMP WITH TIME ZONE)
- **Indexes & Constraints:**
  - Foreign key on `token_config_id`.
  - Index on `chain_name` for filtering by network.

### 1.5. Bridge_Transactions
*Purpose:* Record all bridging actions initiated by token holders.
- **Fields:**
  - `id` (SERIAL, PRIMARY KEY)
  - `user_wallet` (TEXT, NOT NULL) – The wallet initiating the bridge.
  - `action_type` (VARCHAR, NOT NULL) – 'bridge_in' or 'bridge_out'.
  - `source_chain` (VARCHAR, NOT NULL)
  - `destination_chain` (VARCHAR, NOT NULL)
  - `token_amount` (NUMERIC, NOT NULL)
  - `transaction_hash` (VARCHAR) – Hash from the bridging blockchain.
  - `status` (VARCHAR) – e.g., 'pending', 'success', 'failed'.
  - `created_at` (TIMESTAMP WITH TIME ZONE, default NOW())
  - `updated_at` (TIMESTAMP WITH TIME ZONE)
- **Indexes & Constraints:**
  - Index on `user_wallet` and `status` for reporting and lookups.

---

## 2. Authentication & Authorization

### 2.1. Web3 Wallet Authentication
- **Method:**  
  - Use Web3 wallet connection (e.g., MetaMask) via ethers.js.
  - Rely on signature-based verification. When a user connects, prompt them to sign a nonce message.
- **Session Management:**  
  - Generate a JSON Web Token (JWT) upon successful wallet signature verification.
  - **JWT Payload:** Include `wallet_address` and an expiration timestamp.
  - **Storage:** JWTs are stored in secure HTTP-only cookies or in-memory on the client.
- **Roles & Permissions:**
  - No explicit role table is necessary.
  - **Token Creator vs. Token Holder:**  
    - Role is inferred by the actions performed. For instance, initiating a token deployment (configuration + CSV upload) designates a creator; all other users function as token holders.
  - Endpoints that modify deployment data require a valid JWT containing the correct wallet address.

---

## 3. Storage Buckets / File Handling

### 3.1. File Types
- **Images:** Token icons uploaded by token creators.
- **Documents:** CSV files for token distributions.

### 3.2. Storage Provider
- **Recommendation:** AWS S3 (or an alternative like Supabase Storage)
  - **Rationale:** S3 is reliable, scalable, and widely supported.
  
### 3.3. Folder Structure & Access Control
- **Folders:**
  - `/uploads/csv/` – For CSV files (private access; only the creator can read/modify).
  - `/uploads/icons/` – For token icon images (public read access, private write access).
- **Access Rules:**
  - Use S3 bucket policies to ensure that:
    - Only authenticated requests (with proper credentials) can upload files.
    - Files in the icons folder are publicly readable (for display) while CSV files remain private.
  - Consider using signed URLs for temporary access to CSV files.

---

## 4. API Design Layer

### 4.1. Protocol
- **REST API** built with FastAPI.

### 4.2. Main Endpoints

#### 4.2.1. Token Configuration & Deployment
- **POST /api/tokens**
  - **Description:** Create a new token configuration.
  - **Request Body:** JSON payload containing token details (name, decimals, total supply), CSV metadata (or file reference), and selected chains.
  - **Response:** Token configuration ID, initial status.
  
- **GET /api/tokens/{id}**
  - **Description:** Retrieve status and details for a token configuration.
  - **Response:** Token details, deployment status, contract addresses (if deployed), and distribution status.

- **POST /api/tokens/{id}/deploy**
  - **Description:** Trigger the deployment process after fee payment.
  - **Request Body:** Fee payment transaction hash and any additional metadata.
  - **Response:** Deployment progress and eventual success/error messages.

#### 4.2.2. Bridge Transactions
- **POST /api/bridge**
  - **Description:** Initiate a bridging operation (bridge in/out).
  - **Request Body:** JSON payload with action type, source chain, destination chain, token amount, and user wallet.
  - **Response:** Bridge transaction ID and initial status.
  
- **GET /api/bridge/{id}**
  - **Description:** Retrieve the status of a specific bridge transaction.
  - **Response:** Bridge details including transaction hash and status.

#### 4.2.3. Status & Notifications
- **GET /api/status**
  - **Description:** Poll or subscribe for real-time status updates (deployment progress, bridge transaction updates).
  - **Response:** JSON with current statuses (may integrate WebSocket endpoints for real-time updates).

### 4.3. Error & Validation Handling
- **Standardized Error Format:**  
  - Return HTTP status codes with JSON payloads containing an error code and message.
- **Validation:**  
  - Use FastAPI’s Pydantic models for input validation.
  - Return 400 Bad Request for invalid inputs, 401 Unauthorized for missing/invalid JWTs, and 500 for unexpected errors.

---

## 5. Data Security

### 5.1. Encryption & Secure Storage
- **In Transit:**  
  - Enforce HTTPS for all API endpoints.
- **At Rest:**  
  - Use PostgreSQL’s built-in encryption and secure configurations.
  - Sensitive configuration data (e.g., API keys) should be stored in environment variables or a secrets manager.
  
### 5.2. Sensitive Data Handling
- **Public vs. Private Data:**  
  - Public Data: Token details (name, icon URL), deployment status.
  - Private Data: CSV file contents, wallet addresses, deployment logs, and bridge transaction details should be secured.
- **Access Controls:**  
  - Validate JWTs on protected endpoints.
  - Use role-based checks where necessary (e.g., only the token creator can view or modify their deployment data).

---

## 6. Scalability & Modularity

### 6.1. Modular Architecture
- **Service Layer:**  
  - Separate core functionalities into distinct modules or services:
    - **Deployment Service:** Handles fee verification, contract deployment, and token distribution.
    - **Bridge Service:** Manages bridge transactions (burn/mint operations).
    - **User/Session Service:** Manages wallet authentication and JWT session management.
- **Asynchronous Processing:**  
  - Use task queues (e.g., Celery with Redis) for long-running operations like blockchain interactions.
  
### 6.2. Microservices Consideration
- **Future-proofing:**  
  - Design the backend in a modular way that allows splitting services into microservices when scaling.
  - Use API versioning and clear service boundaries to decouple features.
  
### 6.3. Maintenance & Scalability Best Practices
- **Logging & Monitoring:**  
  - Integrate centralized logging (e.g., ELK stack) and monitoring (Prometheus/Grafana).
- **Database Scalability:**  
  - Plan for read replicas and regular backups.
- **Code Organization:**  
  - Follow clean architecture principles with separation of concerns (e.g., controllers, services, data access layers).

---

## Summary

- **Database:** PostgreSQL with tables for users, token configurations, token distributions, deployment logs, and bridge transactions. Data is normalized with appropriate indexes, constraints, and foreign keys.
- **Authentication:** Web3 wallet-based, with signature verification and JWT for session management.
- **File Storage:** AWS S3 (or equivalent) for CSV files and token icons, with secure access controls.
- **APIs:** RESTful endpoints built with FastAPI, using JSON payloads, with robust validation and error handling.
- **Data Security:** HTTPS, encryption at rest, role-based access control, and secure storage practices.
- **Scalability:** Modular service design, asynchronous task queues for long-running tasks, and a clear separation of concerns for easy maintenance and future scaling.

This document provides a detailed, actionable blueprint for the backend implementation of the Universal Token Launcher.
