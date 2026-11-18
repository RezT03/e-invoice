-- Migration: Master Pelanggan (data klien)
-- Fitur fase 3: katalog pelanggan
-- Jalankan sekali: mysql -u <user> -p <db> < db/migration-add-customers.sql

CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  phone VARCHAR(30),
  email VARCHAR(100),
  npwp VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name),
  INDEX idx_company (company),
  INDEX idx_phone (phone)
);
