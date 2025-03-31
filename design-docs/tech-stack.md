# Tech Stack Recommendation Document

This document outlines the recommended technologies for building the Universal Token Launcher. For the MVP, we will keep the frontend simple using HTML and vanilla JavaScript, while maintaining a robust and scalable backend.

---

## 1. Frontend Stack

- **Framework:** 
  - **HTML & Vanilla JavaScript**  
    *Rationale:* For a simple MVP with straightforward UI, using plain HTML and vanilla JS keeps the project lightweight and easier to understand. It minimizes dependencies and complexity while still enabling dynamic interactions.
  
- **UI Libraries & Styling:** 
  - **Tailwind CSS (or simple CSS frameworks)**  
    *Rationale:* Tailwind CSS provides utility-first styling that speeds up development and delivers a modern, clean aesthetic. Alternatively, simple CSS or a lightweight framework like Bulma can be used.
  
- **State Management:** 
  - **Native JavaScript (using built-in features)**  
    *Rationale:* For minimal interactivity, simple JavaScript variables and functions are sufficient for state management without needing a dedicated library.
  
- **Wallet Integration:** 
  - **ethers.js**  
    *Rationale:* Ethers.js is lightweight and works well with vanilla JS for integrating Web3 wallet functionalities (e.g., MetaMask).
  
- **Responsiveness:** 
  - Use responsive design techniques via CSS media queries or Tailwind CSS utilities to ensure the app works well on both mobile and desktop devices.

---

## 2. Backend Stack

- **Language & Framework:** 
  - **Python with FastAPI**  
    *Rationale:* FastAPI offers high performance, asynchronous support, and automatic API documentation. Python’s extensive ecosystem and developer-friendly syntax accelerate rapid development and scalability.
  

---

## 3. Database Layer

- **Primary Database:** 
  - **PostgreSQL**  
    *Rationale:* PostgreSQL is a reliable, ACID-compliant relational database ideal for storing token configurations, deployment logs, and transaction data.
  
- **Caching:** 
  - **Redis**  
    *Rationale:* Redis can be used to cache API responses and session data, reducing load times and enhancing scalability.
  
- **Replication & Scalability:** 
  - Plan for read replicas and regular backups as data volume grows.

---

## 4. Authentication & Authorization

- **Method:** 
  - **Web3 Wallet Authentication Only**  
    *Rationale:* Users authenticate by connecting their Web3 wallet (e.g., MetaMask) with no additional username/password requirements, simplifying access and leveraging decentralized identity.
  
- **Tools:** 
  - Use **ethers.js** in the frontend to prompt wallet signature verification.

---

## 5. APIs

- **Protocol:** 
  - **REST API**  
    *Rationale:* REST is straightforward and well-supported by FastAPI, providing clear endpoints for fee verification, deployment triggers, status updates, and bridging operations.
  
- **Design Pattern:** 
  - Follow RESTful best practices with clear resource naming, proper HTTP status codes, and JSON payloads.
  - Optionally, a GraphQL layer can be added later if more complex querying is needed.

---

## 6. DevOps & Deployment

- **Containerization:** 
  - **Docker**  
    *Rationale:* Docker ensures reproducible builds and simplifies deployment across environments.
  
- **CI/CD Tools:** 
  - **GitHub Actions**
    *Rationale:* Both offer robust pipelines for automated testing, building, and deployment.
  
- **Hosting:** 
  - **Frontend:** Use static hosting services like Vercel or Netlify for lightweight HTML/CSS/JS deployments.
  - **Backend:** Deploy on GCP or Render for scalable backend services.
  
- **Monitoring:** 
  - **Prometheus/Grafana** for performance monitoring.
  - Utilize built-in logging from FastAPI and container orchestration platforms for observability.

---

## 7. Third-Party Integrations

- **Blockchain APIs:** 
  - **Alchemy, AllThatNode, or BlockPI** for reliable EVM network access.
  
- **Wallet SDKs:** 
  - **ethers.js** (integrated in the frontend).
  
- **CSV Parsing Libraries:** 
  - **Papaparse** for frontend CSV parsing and Python’s CSV libraries for backend processing.
  
- **Optional:** 
  - **Supabase** or **Firebase** for additional real-time features or storage if needed later.

---

## 8. Scalability & Future-Proofing

- **Modular Architecture:** 
  - Design backend services as modular components that can later be split into microservices.
  
- **Container Orchestration:** 
  - Consider **Kubernetes** for managing Docker containers as the user base grows.
  
- **Decoupled Frontend/Backend:** 
  - Maintain clear API boundaries between the frontend and backend for easier updates.
  
- **Event-Driven Architecture:** 
  - Use message queues (e.g., RabbitMQ or Kafka) for asynchronous processing, especially for deployment and bridging operations.
  
- **Versioned APIs:** 
  - Implement versioning for REST endpoints to ensure backward compatibility.
  
- **Future Enhancements:** 
  - Ensure the system can integrate additional blockchain networks and expand wallet integrations with minimal refactoring.

---

This updated tech stack recommendation provides a straightforward, plug-and-play guide for an AI coder or engineering team to start building the Universal Token Launcher using HTML and vanilla JavaScript for the frontend, while maintaining a robust backend with Python and FastAPI.
