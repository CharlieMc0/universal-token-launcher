#!/usr/bin/env python
"""Script to delete all but the most recent 2 token deployment records."""

import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Construct database URL from individual components
db_username = os.getenv('DB_USERNAME')
db_password = os.getenv('DB_PASSWORD')
db_host = os.getenv('DB_HOST')
db_port = os.getenv('DB_PORT')
db_name = os.getenv('DB_DATABASE')

if not all([db_username, db_password, db_host, db_port, db_name]):
    print("Error: Database connection details missing in environment variables")
    missing = []
    if not db_username: missing.append("DB_USERNAME")
    if not db_password: missing.append("DB_PASSWORD")
    if not db_host: missing.append("DB_HOST")
    if not db_port: missing.append("DB_PORT")
    if not db_name: missing.append("DB_DATABASE")
    print(f"Missing variables: {', '.join(missing)}")
    exit(1)

# Construct PostgreSQL connection string
db_url = f"postgresql://{db_username}:{db_password}@{db_host}:{db_port}/{db_name}"

print("Connecting to database...")

# Create database engine
engine = create_engine(db_url)

# SQL query to delete all records except the 2 most recent ones
sql = """
DELETE FROM token_deployments 
WHERE id NOT IN (
    SELECT id 
    FROM token_deployments 
    ORDER BY created_at DESC, id DESC 
    LIMIT 1
);
"""

# Execute the query
try:
    with engine.connect() as conn:
        # First, let's get the total count
        total = conn.execute(text("SELECT COUNT(*) FROM token_deployments")).scalar()
        print(f"Total records before deletion: {total}")
        
        # Execute the delete query
        result = conn.execute(text(sql)).rowcount
        
        # Commit the transaction
        conn.commit()
        
        # Get the remaining count
        remaining = conn.execute(text("SELECT COUNT(*) FROM token_deployments")).scalar()
        
        print(f"Deleted {result} records")
        print(f"Remaining records: {remaining}")
        
        # Show the remaining records
        records = conn.execute(text(
            "SELECT id, token_name, created_at FROM token_deployments ORDER BY created_at DESC"
        ))
        print("\nRemaining token records:")
        for record in records:
            print(f"ID: {record.id}, Name: {record.token_name}, "
                  f"Created: {record.created_at}")
            
except Exception as e:
    print(f"Error executing SQL: {str(e)}")
    exit(1)

print("\nCleanup completed successfully!") 