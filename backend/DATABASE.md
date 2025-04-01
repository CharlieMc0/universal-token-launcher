# Universal Token Launcher Database Guide

This document provides information about the database structure, potential issues, and maintenance scripts for the Universal Token Launcher backend.

## Database Structure

The application uses PostgreSQL with the following main tables:

1. **token_configurations**: Stores token creation details (name, symbol, total supply, etc.)
2. **deployment_logs**: Tracks contract deployments on different chains
3. **token_distributions**: Records token distribution instructions

## Common Issues

### Missing Column Errors

If you encounter errors like `column X does not exist`, it usually means:

1. The database schema is out of sync with the model definitions
2. A migration has failed or wasn't applied correctly
3. The column exists with a different name than expected by the model

#### Example Error:

```
Failed to get token: column DeploymentLog.updatedAt does not exist
```

This error typically indicates a mismatch between the Sequelize model (which uses `updatedAt`) and the database table (which might use `updated_at`).

## Database Maintenance Scripts

We've provided several scripts to help manage the database:

### 1. Database Reset

Completely resets the database by dropping all tables and running migrations in the correct order.

```bash
npm run db:reset
```

**CAUTION**: This will delete all data in the database. Use only in development or when data can be rebuilt.

### 2. Database Backup

Creates a backup of the database schema (structure only).

```bash
npm run db:backup
```

### 3. Full Database Backup

Creates a complete backup including all data.

```bash
npm run db:backup:full
```

Backups are stored in the `backend/backups` directory with timestamps.

## Migrations

All database migrations are stored in `src/db/migrations/` and are run in timestamp order. The core migrations are:

1. `20240401000000-create-tables.js` - Creates the initial tables
2. `20240401_add_deployment_error.js` - Adds deployment error tracking
3. `20240402000000-add-verification-fields.js` - Adds contract verification fields
4. `20240403000000-add-deployment-tracking.js` - Adds deployment tracking columns
5. `20250401205436-fix-deployment-log-timestamps.js` - Ensures updated_at column exists

If you need to create a new migration, use the Sequelize CLI:

```bash
npx sequelize-cli migration:generate --name your-migration-name --migrations-path=./src/db/migrations
```

## Troubleshooting

If you encounter database errors:

1. **Check Model Definitions**: Ensure model field definitions match the database column names
2. **Verify Table Structure**: Use PostgreSQL tools to inspect the actual table structure
3. **Review Migration History**: Check which migrations have been applied
4. **Reset if Necessary**: If all else fails, reset the database using `npm run db:reset`
5. **Restore from Backup**: Use PostgreSQL tools to restore from a backup if available

## Database Connection

The application uses the `DATABASE_URL` environment variable to connect to PostgreSQL. Make sure this is properly set in your `.env` file:

```
DATABASE_URL=postgresql://username:password@localhost:5432/database_name
```

## Sequelize ORM

The application uses Sequelize ORM to interact with the database. Key files:

- **Models**: `src/models/`
- **Configuration**: `src/db/config.js`
- **Migrations**: `src/db/migrations/`

Each model defines a `tableName` property that should match the actual table name in the database, and field mappings (`field: 'column_name'`) that connect model attributes to database columns. 