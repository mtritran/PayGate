-- Migration V18: Add 6-digit transaction PIN support to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_code VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_enabled BOOLEAN DEFAULT FALSE;
