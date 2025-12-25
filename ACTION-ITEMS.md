# Action Items - Share Link & Print Template Fix

## ⚙️ Ada 2 Masalah Yang Sudah Di-Fix

### Issue 1: Share Link Selalu Invalid/Expired ❌→✅

**Root Cause:**

- Share token disimpan ke `invoices.share_token` (data lama)
- Tapi viewSharedInvoice mencari di `invoice_shares` table
- Ada mismatch di data structure

**Fixes Applied:**

1. ✅ Fixed `generateShareLink()` - sekarang save ke `invoice_shares` table dengan expiry 30 hari
2. ✅ Fixed template error - `shareToken` sekarang safely handled
3. ✅ Fixed `checkInvoice()` - pass `shareToken: null` ke template

**Data Migration Needed:**
Perlu migrate data lama dari `invoices.share_token` ke `invoice_shares` table

---

### Issue 2: Print Button Tanpa Template Selector ❌→✅

**Requirement:**
User harus bisa pilih template (Normal/Dot Matrix) sebelum cetak

**Fixes Applied:**

1. ✅ Changed print button dari simple button ke dropdown selector
2. ✅ Added `handlePrintWithTemplate()` function
3. ✅ Added print CSS styling untuk A4 format
4. ✅ QR code info hidden saat print

**Result:**

- User bisa select template sebelum print
- Print preview show proper formatting
- No header/buttons di print output

---

## 🚀 What You Need To Do Next

### Step 1: Run Database Migration (CRITICAL)

```sql
-- Copy & paste ini ke MySQL console atau phpMyAdmin

-- 1. Check status
SELECT COUNT(*) as old_shares FROM invoices WHERE share_token IS NOT NULL;
SELECT COUNT(*) as new_shares FROM invoice_shares;

-- 2. Migrate old data ke invoice_shares
INSERT INTO invoice_shares (invoice_id, share_token, expires_at, created_at)
SELECT
  i.id,
  i.share_token,
  DATE_ADD(i.share_token_created_at, INTERVAL 30 DAY),
  i.share_token_created_at
FROM invoices i
WHERE i.share_token IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM invoice_shares s
    WHERE s.invoice_id = i.id
  )
ON DUPLICATE KEY UPDATE created_at = VALUES(created_at);

-- 3. Set expiry untuk shares tanpa expires_at
UPDATE invoice_shares
SET expires_at = DATE_ADD(created_at, INTERVAL 30 DAY)
WHERE expires_at IS NULL;

-- 4. Verify
SELECT COUNT(*) as total_shares,
       COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as valid_shares,
       COUNT(CASE WHEN expires_at <= NOW() THEN 1 END) as expired_shares
FROM invoice_shares;
```

### Step 2: Restart Server

```bash
# Kill existing server
pkill -9 npm node nodemon

# Restart
cd /media/yogaa/SSD\ SATA/RESTUPRO/Web/e-invoice
npm run dev
```

### Step 3: Test Share Link

**Admin:**

1. Login ke dashboard
2. Pilih existing invoice
3. Klik "Generate Share Link" button
4. Copy generated URL

**Test Access:**

1. Open URL di browser baru / incognito mode
2. Invoice harus tampil (bukan error)
3. Klik "Download PDF" - pilih template
4. Download harus berhasil

### Step 4: Test Print Template

**User accessing invoice:**

1. Open invoice (share link atau check by number)
2. Lihat dropdown "Cetak Sebagai"
3. Select "Cetak (Normal)"
4. Print dialog should open
5. Preview harus show proper formatting
6. Select "Cetak (Dot Matrix)" - preview harus berbeda

---

## 📋 Verification Checklist

Sebelum bilang "SELESAI", pastikan:

### Share Link ✅

- [ ] Old share links (lama) sudah di-migrate
- [ ] New share link (dari admin) bisa di-generate
- [ ] Generated link bisa di-akses
- [ ] PDF download works dari share link
- [ ] Link invalid message muncul untuk invalid token
- [ ] Link expired message muncul setelah 30 hari

### Print Template ✅

- [ ] Dropdown "Cetak Sebagai" muncul
- [ ] Print dengan "Normal" template works
- [ ] Print dengan "Dot Matrix" template works
- [ ] Header & buttons tidak muncul di print
- [ ] QR code info tidak muncul di print
- [ ] Formatting proper untuk kedua template
- [ ] Works di Chrome & Firefox

---

## 📂 Files Yang Berubah

1. **adminInvoiceController.js** - `generateShareLink()` diperbaiki
2. **userInvoiceController.js** - `checkInvoice()` ditambah `shareToken: null`
3. **invoice-view.ejs** - Print button diperbaiki + CSS styling ditambah

---

## 🆘 Jika Ada Error

### Share link masih error "tidak valid atau telah kadaluarsa"

**Check:**

```sql
-- Verify data migration success
SELECT COUNT(*) FROM invoice_shares
WHERE share_token IS NOT NULL;

-- Check specific token
SELECT * FROM invoice_shares
WHERE share_token = 'token_from_url';

-- Check expiry
SELECT expires_at > NOW() as is_valid FROM invoice_shares
WHERE share_token = 'token_from_url';
```

### Print dropdown tidak muncul

**Check browser console:**

1. F12 → Console tab
2. Cek ada error message
3. Test function: `handlePrintWithTemplate()`

---

## ✨ Summary

✅ Share link sudah di-fix
✅ Print template selector sudah di-implement
✅ Database structure siap
⏳ Tinggal: Run migration + Test

Semua code change sudah done, sekarang tinggal run migration SQL dan test!

---

**NEXT ACTION:** Run SQL migration di Step 1 ☝️
