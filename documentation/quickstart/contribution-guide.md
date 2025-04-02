# Universal Token Launcher Contribution Guide

Welcome to the Universal Token Launcher project! This guide will help you understand how to contribute effectively to the project.

## Getting Started

1. **Fork the repository** to your own GitHub account
2. **Clone your fork** to your local machine
3. **Set up your development environment** following the [Quick Start Guide](./quick-start-guide.md)

## Branching Strategy

- **main** - Main development branch, always in a working state
- **feature/*** - Feature branches for new functionality
- **fix/*** - Branches for bug fixes
- **release/*** - Release preparation branches

## Development Workflow

1. **Create a new branch** from the latest `main`
   ```bash
   git checkout main
   git pull
   git checkout -b feature/your-feature-name
   ```

2. **Implement your changes** following the code style and patterns in the existing code

3. **Write tests** for new functionality

4. **Run tests** to ensure everything works
   ```bash
   # Backend tests
   cd backend
   npm test
   
   # Frontend tests (if applicable)
   cd frontend
   npm test
   ```

5. **Update documentation** if necessary

6. **Commit your changes** with clear commit messages
   ```bash
   git add .
   git commit -m "feat: Add new feature for X"
   ```

7. **Push your branch** to your fork
   ```bash
   git push -u origin feature/your-feature-name
   ```

8. **Create a pull request** to the main repository

## Pull Request Guidelines

When submitting a pull request:

1. **Include a clear description** of the changes
2. **Reference any related issues**
3. **Ensure all tests pass**
4. **Document any new functionality** or changes to existing behavior
5. **Make sure the code follows the project's style and patterns**

## Code Style

### Backend

- Use `camelCase` for variables and functions
- Use `PascalCase` for class names and constructor functions
- Follow the existing project structure:
  - **Controllers**: Handle HTTP requests and responses
  - **Services**: Contain business logic
  - **Models**: Define database models and relationships
  - **Routes**: Define API endpoints
  - **Utils**: Contain helper functions
  - **Constants**: Store constant values

### Frontend

- Use functional components with React hooks
- Use `camelCase` for variables and functions
- Follow UI component patterns in `frontend/src/components`
- Maintain consistent styling using the project's design system

## Testing

### Backend Testing

The backend uses Jest for testing:

```bash
# Run all tests
npm test

# Run a specific test file
npm test -- src/__tests__/unit/services/TokenService.test.js

# Run tests with coverage report
npm run test:coverage
```

Common test issues and solutions:

1. **Mocking External Dependencies:**
   ```javascript
   // Always mock external modules BEFORE importing the modules under test
   jest.mock('ethers', () => ({
     JsonRpcProvider: jest.fn().mockImplementation(() => ({
       getNetwork: jest.fn().mockResolvedValue({ chainId: 1 }),
       getSigner: jest.fn()
     })),
     // Other mocked components...
   }));
   
   // Then import your module
   const moduleUnderTest = require('../path/to/module');
   ```

2. **File System Operations:**
   - Create temporary directories and files in `beforeAll()`
   - Clean up in `afterAll()`
   - Mock `fs` functions to avoid actual file operations

### Frontend Testing

If applicable, the frontend uses React Testing Library:

```bash
# Run all tests
npm test

# Run tests with coverage report
npm test -- --coverage
```

## Common Development Tasks

### Adding a New API Endpoint

1. Create a new controller method in the appropriate controller file
2. Add a new route in the appropriate router file
3. Update the API documentation in `/documentation/api-reference.md`
4. Add tests for the new endpoint

### Adding a New Blockchain Network

1. Update the chain configuration in `/backend/src/constants/chains.js`
2. Add RPC URLs to the environment configuration
3. Update any UI components that display or select chains
4. Test deployment functionality on the new chain

### Updating Smart Contract Code

1. Update the contract code in `/smart-contracts/contracts/`
2. Compile the contracts
3. Update the bytecode and ABI in `/backend/src/constants/bytecode.js`
4. Test deployment and verification functionality

## Troubleshooting

### Common Issues

1. **CORS Issues:**
   - Ensure your backend `.env` has proper CORS configuration
   - For development, set `DEBUG=true` to allow all origins

2. **Database Connection Issues:**
   - Verify PostgreSQL is running
   - Check database credentials in `.env` file
   - Run migrations: `npm run migrate`

3. **Contract Deployment Issues:**
   - Check RPC URLs for each chain
   - Ensure deployer wallet has sufficient funds
   - Verify bytecode is correctly formatted

### Logging

The application uses a comprehensive logging system:

- **Backend Logs**: Located in `/backend/logs/`
- **Viewing Logs**: Use `npm run logs` to view formatted logs
- **Log Types**:
  - `application-combined.log` - All logs
  - `error.log` - Error logs only
  - `deployment.log` - Deployment-specific logs

## Additional Resources

- [API Reference](./api-reference.md)
- [Backend README](../backend/README.md)
- [Tech Stack Details](./tech-stack.md)
- [Application Flow](./app-flow.md)

## Contact

For questions or assistance, please reach out to the project maintainers.

Thank you for contributing to the Universal Token Launcher! 