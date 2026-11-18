-- Migration: Perusahaan penerbit pada Surat Jalan
-- Menambahkan kolom company_id (opsional) pada delivery_notes agar PDF surat jalan
-- dapat menampilkan identitas perusahaan yang benar.
-- Aman dijalankan berulang (idempotent).
-- Jalankan: mysql -u <user> -p <db> < db/migration-add-delivery-company.sql

DROP PROCEDURE IF EXISTS add_delivery_company;

DELIMITER //
CREATE PROCEDURE add_delivery_company()
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'delivery_notes') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'delivery_notes'
                     AND COLUMN_NAME = 'company_id') THEN
      ALTER TABLE delivery_notes ADD COLUMN company_id INT NULL AFTER delivery_number;
      ALTER TABLE delivery_notes ADD INDEX idx_company_id (company_id);
    END IF;
  END IF;
END //
DELIMITER ;

CALL add_delivery_company();
DROP PROCEDURE add_delivery_company;
