-- Migration: Bukti bayar (proof of payment) pada tabel payments
-- Menambahkan kolom untuk menyimpan file bukti pembayaran (JPG/JPEG/PNG/HEIC).
-- Aman dijalankan berulang (idempotent).
-- Jalankan: mysql -u <user> -p <db> < db/migration-add-payment-proof.sql

DROP PROCEDURE IF EXISTS add_payment_proof;

DELIMITER //
CREATE PROCEDURE add_payment_proof()
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments'
                     AND COLUMN_NAME = 'proof_path') THEN
      ALTER TABLE payments ADD COLUMN proof_path VARCHAR(255) NULL AFTER notes;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments'
                     AND COLUMN_NAME = 'proof_original_name') THEN
      ALTER TABLE payments ADD COLUMN proof_original_name VARCHAR(255) NULL AFTER proof_path;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments'
                     AND COLUMN_NAME = 'proof_mime') THEN
      ALTER TABLE payments ADD COLUMN proof_mime VARCHAR(100) NULL AFTER proof_original_name;
    END IF;
  END IF;
END //
DELIMITER ;

CALL add_payment_proof();
DROP PROCEDURE add_payment_proof;
