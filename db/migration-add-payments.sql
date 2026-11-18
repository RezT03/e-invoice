-- Migration: Pembayaran (Payments / Termin)
-- Fitur fase 5: catat pembayaran per invoice
-- Jalankan sekali: mysql -u <user> -p <db> < db/migration-add-payments.sql

CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(36) PRIMARY KEY,
  payment_number VARCHAR(100) UNIQUE NOT NULL,
  invoice_id VARCHAR(36) NULL,
  customer_id VARCHAR(36) NULL,
  payment_date DATE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  method ENUM('cash', 'transfer', 'qris', 'other') DEFAULT 'transfer',
  reference VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_payment_number (payment_number),
  INDEX idx_invoice_id (invoice_id),
  INDEX idx_payment_date (payment_date)
);
