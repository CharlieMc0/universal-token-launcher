# Universal Token Launcher Backend Rebuilding Guide

This guide will walk you through rebuilding the Universal Token Launcher backend from scratch, providing detailed instructions and code samples at each step.

## Table of Contents

1. [Project Setup](1-project-setup.md)
   - Environment setup
   - Dependencies installation
   - Project structure
   - Configuration files

2. [Database Setup](2-database-setup.md)
   - PostgreSQL setup
   - Sequelize models
   - Database initialization
   - Migrations

3. [Utilities](3-utilities.md)
   - Chain information utilities
   - Logging system
   - File upload handling
   - CSV processing

4. [Services](4-services.md)
   - Contract service
   - Token service
   - Verification service
   - Distribution service

5. [API Implementation](5-api-implementation.md)
   - Controllers
   - Routes
   - Middleware
   - Error handling

6. [Testing](6-testing.md)
   - Unit tests
   - Integration tests
   - Mocking
   - Test scripts

## Getting Started

Start by following the [Project Setup](1-project-setup.md) guide to create the basic project structure and install dependencies.

## Prerequisites

- Node.js v16+
- PostgreSQL database
- Git
- Text editor/IDE (VS Code recommended)
- Basic knowledge of Express.js, Sequelize, and ethers.js

## Features Overview

The Universal Token Launcher backend provides:

- Token configuration and deployment
- Cross-chain contract deployment
- Contract verification on block explorers
- Token distribution
- Comprehensive logging system
- User authentication

Follow each section in order to build a complete, fully-functional backend system for the Universal Token Launcher. 