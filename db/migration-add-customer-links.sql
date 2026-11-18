-- Migration: Integrasi Pelanggan ke Invoice & Booking
-- Menambahkan kolom customer_id (opsional) pada invoices dan bookings.
-- Aman dijalankan berulang (idempotent).
-- Jalankan: mysql -u <user> -p <db> < db/migration-add-customer-links.sql

DROP PROCEDURE IF EXISTS add_customer_links;

DELIMITER //
CREATE PROCEDURE add_customer_links()
BEGIN
  -- invoices.customer_id
  IF EXISTS (SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices'
                     AND COLUMN_NAME = 'customer_id') THEN
      ALTER TABLE invoices ADD COLUMN customer_id VARCHAR(36) NULL AFTER company_id;
      ALTER TABLE invoices ADD INDEX idx_customer_id (customer_id);
    END IF;
  END IF;

  -- bookings.customer_id
  IF EXISTS (SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings'
                     AND COLUMN_NAME = 'customer_id') THEN
      ALTER TABLE bookings ADD COLUMN customer_id VARCHAR(36) NULL AFTER booking_number;
      ALTER TABLE bookings ADD INDEX idx_customer_id (customer_id);
    END IF;
  END IF;
END //
DELIMITER ;

CALL add_customer_links();
DROP PROCEDURE add_customer_links;
