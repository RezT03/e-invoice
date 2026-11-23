-- ============================================================
-- Migration: Multi rekening perusahaan + opsi tampilan PDF normal
-- Jalankan sekali pada database e-invoice. Aman dijalankan ulang.
-- ============================================================

-- 1. Tabel rekening perusahaan (satu company bisa punya banyak rekening)
CREATE TABLE IF NOT EXISTS company_bank_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  bank_name VARCHAR(100) NOT NULL DEFAULT '',
  account_number VARCHAR(50) NOT NULL DEFAULT '',
  account_name VARCHAR(255) NOT NULL DEFAULT '',
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  INDEX idx_company_bank_accounts_company (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Kolom opsi PDF normal pada invoices (default: kosong/tidak ditampilkan).
--    Rekening sengaja TIDAK diisi otomatis; isi manual lewat halaman detail invoice.
SET @db_name := DATABASE();

SET @sql := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE invoices ADD COLUMN pdf_show_bank TINYINT(1) NOT NULL DEFAULT 0 AFTER paid_date',
    'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'invoices'
    AND COLUMN_NAME = 'pdf_show_bank'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE invoices ADD COLUMN pdf_bank_account_ids TEXT NULL AFTER pdf_show_bank',
    'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'invoices'
    AND COLUMN_NAME = 'pdf_bank_account_ids'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql := (
  SELECT IF(COUNT(*) = 0,
    'ALTER TABLE invoices ADD COLUMN pdf_show_paid_notice TINYINT(1) NOT NULL DEFAULT 0 AFTER pdf_bank_account_ids',
    'SELECT 1')
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'invoices'
    AND COLUMN_NAME = 'pdf_show_paid_notice'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
