-- Fix Share Link Issues
-- Migration script untuk memperbaiki share token mismatch

-- 1. Bersihkan data lama di invoice_shares (optional - hapus jika sudah ada)
-- DELETE FROM invoice_shares WHERE share_token IS NULL OR share_token = '';

-- 2. Migrate share tokens dari invoices ke invoice_shares jika ada data lama
INSERT INTO invoice_shares (invoice_id, share_token, expires_at, created_at)
SELECT 
  i.id, 
  i.share_token, 
  DATE_ADD(i.share_token_created_at, INTERVAL 30 DAY) as expires_at,
  i.share_token_created_at
FROM invoices i
WHERE i.share_token IS NOT NULL 
  AND i.share_token != ''
  AND NOT EXISTS (
    SELECT 1 FROM invoice_shares s 
    WHERE s.invoice_id = i.id
  )
ON DUPLICATE KEY UPDATE share_token = VALUES(share_token);

-- 3. Update semua existing shares yang tidak punya expires_at (set ke 30 hari kemudian)
UPDATE invoice_shares 
SET expires_at = DATE_ADD(NOW(), INTERVAL 30 DAY)
WHERE expires_at IS NULL;

-- 4. Cleanup invoice table - hapus share tokens lama dari invoices table
ALTER TABLE invoices 
DROP COLUMN IF EXISTS share_token,
DROP COLUMN IF EXISTS share_token_created_at;

-- Verifikasi
SELECT 
  COUNT(*) as total_shares,
  COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as valid_shares,
  COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_shares
FROM invoice_shares;

SELECT COUNT(*) as invoices_with_share
FROM invoices i
WHERE EXISTS (SELECT 1 FROM invoice_shares s WHERE s.invoice_id = i.id);
