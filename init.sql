-- PostgreSQL initialization script for Currify

-- Create database extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- The database will be created by the POSTGRES_DB environment variable
-- This script just initializes any additional setup needed

-- Example: Create a monitoring user if needed
-- CREATE USER monitoring_user WITH PASSWORD 'monitoring_password';
-- GRANT USAGE ON SCHEMA public TO monitoring_user;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO monitoring_user;