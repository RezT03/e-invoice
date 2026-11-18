-- Migration: Surat Jalan (Delivery Note) — barang keluar & kembali
-- Fitur fase 4: surat jalan per booking
-- Jalankan sekali: mysql -u <user> -p <db> < db/migration-add-delivery-notes.sql

CREATE TABLE IF NOT EXISTS delivery_notes (
  id VARCHAR(36) PRIMARY KEY,
  delivery_number VARCHAR(100) UNIQUE NOT NULL,
  booking_id VARCHAR(36) NULL,
  customer_id VARCHAR(36) NULL,
  recipient_name VARCHAR(255) NOT NULL,
  recipient_phone VARCHAR(30),
  recipient_address TEXT,
  driver_name VARCHAR(255),
  vehicle_number VARCHAR(50),
  delivery_date DATE,
  return_date DATE,
  items JSON,
  status ENUM('draft', 'delivered', 'returned', 'cancelled') DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_delivery_number (delivery_number),
  INDEX idx_booking_id (booking_id),
  INDEX idx_status (status),
  INDEX idx_delivery_date (delivery_date)
);
