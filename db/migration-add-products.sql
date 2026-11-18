-- Migration: Master Produk & Stok (katalog barang sewa)
-- Fitur fase 2: katalog produk + stok
-- Jalankan sekali: mysql -u <user> -p <db> < db/migration-add-products.sql

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(36) PRIMARY KEY,
  sku VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  unit VARCHAR(30) DEFAULT 'unit',
  rental_price DECIMAL(15, 2) DEFAULT 0,
  purchase_price DECIMAL(15, 2) DEFAULT 0,
  stock_total INT DEFAULT 0,
  stock_available INT DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_sku (sku),
  INDEX idx_name (name),
  INDEX idx_category (category)
);
