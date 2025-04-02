# Universal Token Contract Deployment Service (Python)

This is a Python implementation of the Universal Token Contract Deployment Service, which allows users to deploy token contracts across multiple blockchains, including ZetaChain.

## Technology Stack

- **Python 3.11** - Core programming language (**specifically 3.11, not compatible with 3.13**)
- **FastAPI** - Modern, high-performance web framework
- **SQLAlchemy** - SQL toolkit and ORM
- **Alembic** - Database migration tool
- **Web3.py** - Library for interacting with Ethereum-like blockchains
- **PostgreSQL** - Relational database for storing deployment information
- **Pydantic** - Data validation and settings management
- **Uvicorn** - ASGI server for running the application

## Features

- Deploy token contracts on ZetaChain and other EVM-compatible chains
- Track deployment status and contract addresses
- Verify contracts on blockchain explorers
- View supported chains and their configurations
- Connect tokens across multiple chains

## Project Structure

The project follows a simplified, more Pythonic structure:

```
backend-python/
├── app/                    # Main application package
│   ├── __init__.py         # Package initialization
│   ├── app.py              # FastAPI application and main entry point
│   ├── config.py           # Configuration settings
│   ├── db.py               # Database connection and utilities
│   ├── models/             # Data models and schemas
│   │   ├── __init__.py
│   │   ├── base.py         # Re-exports Base and engine to avoid circular imports
│   │   └── token.py        # Combined DB models and API schemas
│   ├── routes/             # API routes
│   │   ├── __init__.py
│   │   └── deployment.py   # Token deployment endpoints
│   ├── services/           # Business logic
│   │   ├── __init__.py
│   │   ├── deployment.py   # Token deployment service
│   │   └── verification.py # Contract verification service
│   └── utils/              # Utility functions
│       ├── __init__.py
│       ├── logger.py       # Logging utilities
│       └── web3_helper.py  # Web3 interaction utilities
├── artifacts/              # Contract artifacts for deployment
├── migrations/             # Alembic migrations
├── tests/                  # Test files
├── alembic.ini             # Alembic configuration
├── requirements.txt        # Project dependencies
├── run_app.py              # Simple script to run the application
├── start_api.py            # Alternative script to start the API
└── .env                    # Environment variables
```

## Key Improvements

1. **Flattened Structure**: Simplified directory structure with fewer nesting levels
2. **Combined Models**: DB models and API schemas are in the same files
3. **Centralized Config**: Configuration in a single module
4. **Pythonic Imports**: More direct import statements
5. **Web3 Helper**: Utilities for blockchain interactions
6. **Start Scripts**: Multiple ways to run the application

## Getting Started

### Prerequisites

- Python 3.11 (specifically 3.11, not compatible with 3.13)
- PostgreSQL
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/universal-token-launcher.git
cd universal-token-launcher/backend-python
```

2. Create and activate a virtual environment:
```bash
python3.11 -m venv venv_311
source venv_311/bin/activate  # On Windows: venv_311\Scripts\activate
```

3. Install dependencies:
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

4. Create the environment file:
```bash
cp .env.example .env
```

5. Edit the `.env` file with your configuration settings, especially:
   - Database connection details
   - Deployer private key (used for contract deployment)
   - Explorer API keys (used for contract verification)

### Database Setup

1. Create a PostgreSQL database:
```bash
createdb universal_token_registry
```

2. Run database migrations:
```bash
alembic upgrade head
```

### Running the Application

There are multiple ways to start the application:

1. Using the Python module directly:
```bash
python -m app.app
```

2. Using the run_app.py script:
```bash
python run_app.py
```

3. Using the start_api.py script:
```bash
chmod +x start_api.py  # Make it executable (Unix-like systems)
./start_api.py
```

4. Using uvicorn directly:
```bash
uvicorn app.app:app --host 0.0.0.0 --port 8000
```

The API will be available at http://localhost:8000

For development with auto-reload:
```bash
uvicorn app.app:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

- `GET /` - Check if the service is running
- `GET /api/chains` - Get a list of supported chains
- `POST /api/deploy` - Deploy a token on multiple chains
- `POST /api/verify` - Verify a contract on a blockchain explorer

## Development

### Creating Migrations

When you change the database models, create a new migration:
```bash
alembic revision --autogenerate -m "Description of changes"
```

Apply the migration:
```bash
alembic upgrade head
```

### Testing

Run tests using pytest:
```bash
pytest
```

## Troubleshooting

### Python Version Issues

This project requires Python 3.11 specifically:

1. Make sure you're using Python 3.11:
```bash
python --version  # Should report 3.11.x
```

2. If using the wrong Python version, create a new virtual environment with 3.11:
```bash
python3.11 -m venv venv_311
source venv_311/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

### Database Column Naming Issues

If you encounter errors related to column names (like `createdAt` vs `created_at`), this is likely due to a mismatch between your database schema and the SQLAlchemy models:

1. Reset the migration history and recreate the tables:
```bash
alembic revision --autogenerate -m "recreate_tables"
alembic upgrade head
```

2. If you need to drop and recreate the entire database:
```bash
dropdb universal_token_registry
createdb universal_token_registry
alembic upgrade head
```

### Port Already in Use

If you see "address already in use" errors when starting the server:

1. Find and stop the process using the port:
```bash
lsof -i :8000  # Find process ID
kill <PID>     # Replace <PID> with the process ID
```

2. Or use a different port:
```bash
uvicorn app.app:app --host 0.0.0.0 --port 8001
```

### Package Installation Issues

If you encounter issues with packages like `psycopg2-binary`:

1. Make sure you're using Python 3.11 specifically
2. Install required system dependencies for PostgreSQL
3. Try installing the package separately:
```bash
pip install psycopg2-binary==2.9.9
```

## License

This project is licensed under the MIT License - see the LICENSE file for details. 