-- ============================================================================
-- E-INVOICE — MIGRASI DATABASE LENGKAP (FASE 1 s/d FASE 5)
-- ============================================================================
-- File ini menggabungkan SELURUH perubahan database dari semua fase:
--
--   Fase 1  : Booking / Jadwal Event          -> tabel `bookings`
--   Fase 2  : Master Produk & Stok            -> tabel `products`
--   Fase 3  : Master Pelanggan                -> tabel `customers`
--             Integrasi pelanggan ke dokumen -> kolom `customer_id`
--   Fase 4  : Surat Jalan                     -> tabel `delivery_notes`
--             Perusahaan penerbit surat jalan-> kolom `company_id`
--   Fase 5  : Pembayaran / Termin             -> tabel `payments`
--             Bukti bayar (upload gambar)     -> kolom `proof_*`
--
-- Sifat script: AMAN DIJALANKAN BERULANG (idempotent).
--   * Tabel baru : CREATE TABLE IF NOT EXISTS (tidak menimpa tabel yang ada)
--   * Kolom/index: hanya ditambahkan jika BELUM ada. Pengecekan memakai
--     information_schema + prepared statement, TANPA stored procedure /
--     DELIMITER, sehingga aman diimpor lewat phpMyAdmin maupun CLI MySQL.
--
-- Cara pakai di hosting (import sekali saja):
--   1) Pastikan tabel dasar sudah ada (schema.sql), yaitu: admins, companies,
--      invoice_templates, invoices, invoice_shares.
--   2) Jalankan file ini:
--        - phpMyAdmin : menu Import -> pilih file ini -> Go
--        - CLI MySQL  : mysql -u USER -p NAMA_DB < db/migration-all-phases.sql
--
-- Catatan charset/collation:
--   Tabel baru TIDAK memaksa collation tertentu (hanya charset utf8mb4), supaya
--   seragam dengan tabel lain di server tujuan. JOIN payments <-> invoices di
--   aplikasi sudah dipaksa memakai COLLATE utf8mb4_general_ci, jadi perbedaan
--   collation antar-tabel tidak menjadi masalah.
-- ============================================================================

SET NAMES utf8mb4;


-- ============================================================================
-- BAGIAN A — TABEL BARU (CREATE TABLE)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- FASE 1 — Booking / Jadwal Event
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR(36) PRIMARY KEY,
  booking_number VARCHAR(100) UNIQUE NOT NULL,
  customer_id VARCHAR(36) NULL,
  title VARCHAR(255) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20),
  customer_email VARCHAR(100),
  location VARCHAR(255),
  event_start DATETIME NOT NULL,
  event_end DATETIME NOT NULL,
  crew_name VARCHAR(255),
  status ENUM('draft', 'confirmed', 'ongoing', 'completed', 'cancelled') DEFAULT 'draft',
  notes TEXT,
  -- Hasil sinkronisasi Google Calendar (best-effort, service account tanpa OAuth)
  google_event_id VARCHAR(255),
  google_calendar_id VARCHAR(255),
  sync_status ENUM('pending', 'synced', 'failed', 'skipped') DEFAULT 'pending',
  sync_error TEXT,
  synced_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_booking_number (booking_number),
  INDEX idx_event_start (event_start),
  INDEX idx_status (status),
  INDEX idx_customer_id (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- FASE 2 — Master Produk & Stok
-- ---------------------------------------------------------------------------
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- FASE 3 — Master Pelanggan
-- ---------------------------------------------------------------------------
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- FASE 4 — Surat Jalan (barang keluar & kembali)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS delivery_notes (
  id VARCHAR(36) PRIMARY KEY,
  delivery_number VARCHAR(100) UNIQUE NOT NULL,
  company_id INT NULL,                -- perusahaan penerbit (opsional, untuk PDF)
  booking_id VARCHAR(36) NULL,        -- relasi opsional (tanpa FK, aman saat master dihapus)
  customer_id VARCHAR(36) NULL,       -- relasi opsional (tanpa FK)
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
  INDEX idx_delivery_date (delivery_date),
  INDEX idx_company_id (company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------------
-- FASE 5 — Pembayaran / Termin (+ bukti bayar)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(36) PRIMARY KEY,
  payment_number VARCHAR(100) UNIQUE NOT NULL,
  invoice_id VARCHAR(36) NULL,        -- relasi opsional (tanpa FK)
  customer_id VARCHAR(36) NULL,       -- relasi opsional (tanpa FK)
  payment_date DATE NOT NULL,
  amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
  method ENUM('cash', 'transfer', 'qris', 'other') DEFAULT 'transfer',
  reference VARCHAR(100),
  notes TEXT,
  -- Bukti bayar: file disimpan di folder uploads/payments (bukan di database)
  proof_path VARCHAR(255) NULL,
  proof_original_name VARCHAR(255) NULL,
  proof_mime VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_payment_number (payment_number),
  INDEX idx_invoice_id (invoice_id),
  INDEX idx_payment_date (payment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- ============================================================================
-- BAGIAN B — PERUBAHAN TABEL YANG SUDAH ADA (ALTER TABLE, idempotent)
-- ============================================================================
-- Setiap blok mengecek information_schema: kalau kolom/index SUDAH ada, blok itu
-- dilewati (menjalankan "DO 0"). Jadi tidak akan muncul error #1060 lagi.
-- Berguna bila tabel sudah pernah dibuat oleh migrasi fase sebelumnya.

-- --- FASE 3: invoices.customer_id -------------------------------------------
SET @has := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'customer_id');
SET @sql := IF(@has = 0, 'ALTER TABLE `invoices` ADD COLUMN `customer_id` VARCHAR(36) NULL AFTER `company_id`', 'DO 0');
PREPARE ei FROM @sql; EXECUTE ei; DEALLOCATE PREPARE ei;

SET @has := (SELECT COUNT(*) FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND INDEX_NAME = 'idx_customer_id');
SET @sql := IF(@has = 0, 'ALTER TABLE `invoices` ADD INDEX `idx_customer_id` (`customer_id`)', 'DO 0');
PREPARE ei FROM @sql; EXECUTE ei; DEALLOCATE PREPARE ei;

-- --- FASE 3: bookings.customer_id -------------------------------------------
SET @has := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'customer_id');
SET @sql := IF(@has = 0, 'ALTER TABLE `bookings` ADD COLUMN `customer_id` VARCHAR(36) NULL AFTER `booking_number`', 'DO 0');
PREPARE ei FROM @sql; EXECUTE ei; DEALLOCATE PREPARE ei;

SET @has := (SELECT COUNT(*) FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND INDEX_NAME = 'idx_customer_id');
SET @sql := IF(@has = 0, 'ALTER TABLE `bookings` ADD INDEX `idx_customer_id` (`customer_id`)', 'DO 0');
PREPARE ei FROM @sql; EXECUTE ei; DEALLOCATE PREPARE ei;

-- --- FASE 4: delivery_notes.company_id --------------------------------------
SET @has := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'delivery_notes' AND COLUMN_NAME = 'company_id');
SET @sql := IF(@has = 0, 'ALTER TABLE `delivery_notes` ADD COLUMN `company_id` INT NULL AFTER `delivery_number`', 'DO 0');
PREPARE ei FROM @sql; EXECUTE ei; DEALLOCATE PREPARE ei;

SET @has := (SELECT COUNT(*) FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'delivery_notes' AND INDEX_NAME = 'idx_company_id');
SET @sql := IF(@has = 0, 'ALTER TABLE `delivery_notes` ADD INDEX `idx_company_id` (`company_id`)', 'DO 0');
PREPARE ei FROM @sql; EXECUTE ei; DEALLOCATE PREPARE ei;

-- --- FASE 5: payments.proof_path --------------------------------------------
SET @has := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'proof_path');
SET @sql := IF(@has = 0, 'ALTER TABLE `payments` ADD COLUMN `proof_path` VARCHAR(255) NULL AFTER `notes`', 'DO 0');
PREPARE ei FROM @sql; EXECUTE ei; DEALLOCATE PREPARE ei;

-- --- FASE 5: payments.proof_original_name -----------------------------------
SET @has := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'proof_original_name');
SET @sql := IF(@has = 0, 'ALTER TABLE `payments` ADD COLUMN `proof_original_name` VARCHAR(255) NULL AFTER `proof_path`', 'DO 0');
PREPARE ei FROM @sql; EXECUTE ei; DEALLOCATE PREPARE ei;

-- --- FASE 5: payments.proof_mime --------------------------------------------
SET @has := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'proof_mime');
SET @sql := IF(@has = 0, 'ALTER TABLE `payments` ADD COLUMN `proof_mime` VARCHAR(100) NULL AFTER `proof_original_name`', 'DO 0');
PREPARE ei FROM @sql; EXECUTE ei; DEALLOCATE PREPARE ei;

-- --- Kompatibilitas Invoice: document_type (penawaran harga) ----------------
SET @has := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'document_type');
SET @sql := IF(@has = 0, 'ALTER TABLE `invoices` ADD COLUMN `document_type` ENUM(''invoice'', ''quotation'') DEFAULT ''invoice'' AFTER `status`', 'DO 0');
PREPARE ei FROM @sql; EXECUTE ei; DEALLOCATE PREPARE ei;

SET @has := (SELECT COUNT(*) FROM information_schema.STATISTICS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND INDEX_NAME = 'idx_document_type');
SET @sql := IF(@has = 0, 'ALTER TABLE `invoices` ADD INDEX `idx_document_type` (`document_type`)', 'DO 0');
PREPARE ei FROM @sql; EXECUTE ei; DEALLOCATE PREPARE ei;

-- --- Kompatibilitas Invoice: diskon -----------------------------------------
SET @has := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'discount_type');
SET @sql := IF(@has = 0, 'ALTER TABLE `invoices` ADD COLUMN `discount_type` ENUM(''none'', ''percentage'', ''nominal'') DEFAULT NULL', 'DO 0');
PREPARE ei FROM @sql; EXECUTE ei; DEALLOCATE PREPARE ei;

SET @has := (SELECT COUNT(*) FROM information_schema.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'discount_value');
SET @sql := IF(@has = 0, 'ALTER TABLE `invoices` ADD COLUMN `discount_value` DECIMAL(15, 2) DEFAULT NULL', 'DO 0');
PREPARE ei FROM @sql; EXECUTE ei; DEALLOCATE PREPARE ei;


-- ============================================================================
-- BAGIAN C — VERIFIKASI (opsional, boleh diabaikan hasilnya)
-- ============================================================================
SELECT TABLE_NAME AS tabel
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('bookings', 'products', 'customers', 'delivery_notes', 'payments')
ORDER BY TABLE_NAME;

SELECT TABLE_NAME AS tabel, COLUMN_NAME AS kolom
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND (
    (TABLE_NAME = 'invoices'       AND COLUMN_NAME IN ('customer_id', 'document_type', 'discount_type', 'discount_value')) OR
    (TABLE_NAME = 'bookings'       AND COLUMN_NAME = 'customer_id') OR
    (TABLE_NAME = 'delivery_notes' AND COLUMN_NAME = 'company_id') OR
    (TABLE_NAME = 'payments'       AND COLUMN_NAME IN ('proof_path', 'proof_original_name', 'proof_mime'))
  )
ORDER BY TABLE_NAME, COLUMN_NAME;
