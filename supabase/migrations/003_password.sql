-- Migration 003: Add password support to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;
