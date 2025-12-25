# 🎯 FITUR-FITUR DETAIL E-INVOICE SYSTEM

## 📖 Table of Contents

1. [User Features](#user-features)
2. [Admin Features](#admin-features)
3. [Technical Features](#technical-features)
4. [Customization Guide](#customization-guide)

---

## 👥 USER FEATURES

### 1. Check Invoice (Cek Invoice)

**URL**: `/` atau `/invoice/check`

**Cara Kerja**:

- User mengisi form dengan:
  - **Nomor Invoice** (e.g., INV-2025-001)
  - **Nomor Telepon Penerima** (e.g., 08123456789)
- Sistem cari invoice di database dengan kondisi:
  - `invoice_number` = input user
  - `recipient_phone` = input user
- Jika ditemukan → Tampilkan detail invoice
- Jika tidak ditemukan → Tampilkan error message

**Use Case**: Pelanggan ingin lihat invoice mereka tanpa perlu login

---

### 2. Access via Shared Link

**URL**: `/invoice/share/:shareToken`

**Cara Kerja**:

- Admin generate share link untuk invoice tertentu
- Setiap invoice mendapat **unique token** (32 hex characters)
- Link dapat dibagikan ke siapa saja
- User akses link tanpa perlu login atau verifikasi telepon
- Sistem track `accessed_at` untuk logging

**Example Share Link**:

```
http://localhost:3000/invoice/share/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

**Security**:

- Token unique & random
- Bisa add expiry date di future
- Track who accessed it

---

### 3. View Invoice Details

**Fitur**:

- ✅ Tampil logo perusahaan
- ✅ Nomor & status invoice
- ✅ Informasi penerima (nama, telepon, NPWP, alamat)
- ✅ List barang/jasa dengan qty & harga
- ✅ Pajak & biaya tambahan
- ✅ Total amount
- ✅ Bank info untuk pembayaran

**Tampilan**:

- Responsive (mobile-friendly)
- Print-friendly (button print di browser)
- Clean design tanpa banyak animasi

---

### 4. Download PDF

**Format**:

- Dua pilihan: Normal atau Dot Matrix
- Automatic selection dari template yang dipilih

**Fitur PDF**:

- Logo custom sesuai template
- Format professional
- Ready untuk print
- All data included

---

## 👨‍💼 ADMIN FEATURES

### 1. Dashboard

**URL**: `/admin/invoice/dashboard`

**Komponen**:

#### A. Statistik Cards

```
┌─────────────┬──────────────┬────────────┬─────────┐
│ 📄 Total    │ ✓ Sudah      │ 📤 Diterb  │ ⚠️ Over │
│ Invoice: 45 │ Bayar: 30    │ itkan: 10  │ due: 2  │
└─────────────┴──────────────┴────────────┴─────────┘
```

#### B. Total Value Card

- Tampilkan total nilai semua invoice
- Format: Rp 1.250.000.000

#### C. Recent Invoices Table

- List 10 invoice terbaru
- Kolom: No, Penerima, Perusahaan, Tanggal, Total, Status
- Link ke detail page

---

### 2. Create Invoice (Buat Invoice)

**URL**: `/admin/invoice/create`

**Form Sections**:

#### A. Company & Template Selection

```
Perusahaan: [Dropdown ▼]
Template: [Logo1] [Logo2] [Logo3]  ← Visual grid
```

#### B. Invoice Information

- Nomor Invoice (required, unique)
- Status (draft/issued/sent/paid)
- Tanggal Invoice (required)
- Tanggal Jatuh Tempo (optional)

#### C. Recipient Data

- Nama Penerima (required)
- Nomor Telepon (required)
- NPWP (optional)
- Alamat (optional)

#### D. Items/Barang

```
Dynamic rows:
┌──────────────────┬───┬────────┬────────┐
│ Deskripsi        │Qty│ Harga  │ Remove │
├──────────────────┼───┼────────┼────────┤
│ Layanan A        │ 2 │ 500.000│ [X]    │
│ Produk B         │ 1 │1.000.00│ [X]    │
└──────────────────┴───┴────────┴────────┘
[+ Tambah Item]
```

**Auto Calculation**:

- Total per item = Qty × Harga
- Subtotal = Sum semua item
- Total akhir = Subtotal + Pajak

#### E. Pajak & Biaya

```
Dynamic rows:
┌──────────────┬──────────┬────────┐
│ Nama Pajak   │ Jumlah   │ Remove │
├──────────────┼──────────┼────────┤
│ PPN 10%      │ 100.000  │ [X]    │
│ Admin Fee    │ 50.000   │ [X]    │
└──────────────┴──────────┴────────┘
[+ Tambah Pajak]
```

---

### 3. Invoice History (Riwayat)

**URL**: `/admin/invoice/history`

**Fitur**:

- ✅ List semua invoice dengan pagination
- ✅ Search/filter by invoice number or recipient
- ✅ Status badge dengan color coding
- ✅ Sortable by date (newest first)
- ✅ Quick actions: View, Download PDF

**Pagination**:

- Default 20 per halaman
- Navigation: First, Previous, 1, 2, 3..., Next, Last

---

### 4. Invoice Detail & Edit

**URL**: `/admin/invoice/:id`

**Left Panel (Main Content)**:

- Invoice info (nomor, tanggal, status)
- Data penerima (nama, telepon, NPWP, alamat)
- Items table (deskripsi, qty, harga, total)
- Tax breakdown
- Bank info

**Right Sidebar**:

#### A. Total Amount Display

```
╔════════════════════╗
║  TOTAL: Rp 1.5 JT  ║
╚════════════════════╝
```

#### B. Update Status

```
Status: [Dropdown ▼]  ← draft, issued, sent, paid, overdue, cancelled
Paid Date: [Date picker] (jika status = paid)
[Simpan] button
```

#### C. Share Management

```
Generate Share Link
├── If no link:
│   "Generate share link untuk bagikan ke pelanggan"
│
└── If exist:
    ┌───────────────────────────────────┐
    │ http://localhost:3000/invoice/... │
    └───────────────────────────────────┘
    [📋 Copy Link button]
```

#### D. Delete Action

```
[Hapus Invoice] button (red, dangerous)
→ Confirmation dialog sebelum delete
```

---

### 5. Invoice Templates Management

**Fitur** (Future enhancement):

- Create custom templates
- Upload new logos
- Set template per company
- Preview template

**Current**:

- Visual grid saat create invoice
- Select template dengan logo display
- Auto load templates berdasarkan company selection

---

## 🔧 TECHNICAL FEATURES

### 1. Database Features

#### A. Data Integrity

- Unique constraints: username, invoice_number, share_token
- Foreign keys: template_id, company_id
- Indexes for performance: invoice_number, share_token, status

#### B. JSON Storage

- Items stored as JSON array:
  ```json
  [
  	{ "description": "Item A", "quantity": 2, "price": 100000 },
  	{ "description": "Item B", "quantity": 1, "price": 250000 }
  ]
  ```
- Taxes stored as JSON array:
  ```json
  [
  	{ "name": "PPN 10%", "amount": 50000 },
  	{ "name": "Admin Fee", "amount": 25000 }
  ]
  ```

#### C. Share Token System

```sql
-- Generate share
INSERT INTO invoice_shares (invoice_id, share_token, created_at)
VALUES ('uuid-xxx', 'random-hex-32', NOW())

-- Track access
UPDATE invoice_shares
SET accessed_at = NOW()
WHERE share_token = 'token-xxx'
```

---

### 2. Authentication System

#### Session-Based

```javascript
req.session.admin = true // Set saat login
req.session.adminId = 1 // Optional, store user ID
```

#### Middleware Protection

```javascript
// Redirect ke login jika belum authenticated
router.get("/protected", checkAdminAuth, handler)
```

#### Password Security

- Hash: bcrypt dengan salt rounds = 10
- Never store plain text passwords
- Compare on login: `bcrypt.compare(input, hash)`

---

### 3. PDF Generation

#### Two Templates

1. **Normal Template** → Professional invoice format
2. **Dot Matrix Template** → For dot matrix printer format

#### Features

- Custom logo per template
- Dynamic data binding
- Auto-calculation
- Print-optimized layout

#### Usage

```javascript
// In controller
const pdfBuffer = await generatePDF(invoice, "normal")
// or 'dot_matrix'

// Send as download
res.setHeader("Content-Disposition", "attachment; filename=...")
res.send(pdfBuffer)
```

---

### 4. Input Validation & Sanitization

#### Validation Points

- Invoice number: required, alphanumeric
- Recipient phone: required, numeric
- Items: must have at least 1
- Amounts: must be positive numbers

#### Future Enhancement

- Use express-validator library (already in package.json)
- Add middleware for validation

---

### 5. Search & Filter

#### Check Invoice

- Search by: invoice_number + recipient_phone (combined)
- Exact match required
- Prevents information leak

#### History List

- Search by: invoice_number or recipient_name
- Contains search (case-insensitive)
- Server-side search (more secure)

---

## 🎨 CUSTOMIZATION GUIDE

### 1. Change Colors

**File**: `public/css/admin-style.css` & `public/css/style.css`

**Primary Color**:

```css
/* Change from #667eea to your color */
.nav-item:hover {
	color: #YOUR_COLOR;
}
.btn-primary {
	background: #YOUR_COLOR;
}
```

**Example**:

```css
/* Blue theme */
background: linear-gradient(135deg, #1e90ff 0%, #4169e1 100%);

/* Green theme */
background: linear-gradient(135deg, #00b894 0%, #27ae60 100%);

/* Orange theme */
background: linear-gradient(135deg, #ff7675 0%, #e17055 100%);
```

---

### 2. Add Custom Logo

**Steps**:

1. Put image di `public/img/logo-name.png`
2. Update database:
   ```sql
   UPDATE invoice_templates
   SET logo_path = '/img/logo-name.png'
   WHERE id = 1;
   ```
3. Test di form create invoice

**Best Practices**:

- Size: 300x100px
- Format: PNG (transparent background)
- File size: < 100KB

---

### 3. Customize Invoice Template

**File**: `pdf_templates/normalTemplate.js` & `pdf_templates/dotMatrixTemplate.js`

**Change**:

- Fonts, sizes, colors
- Logo position
- Company info layout
- Item table format
- Footer content

**Example modification**:

```javascript
// Add custom footer
pdf.fontSize(10)
pdf.text("Terima kasih atas kepercayaan Anda", 50, y)
pdf.text("© 2025 Restu Production. All rights reserved.", 50, y + 20)
```

---

### 4. Change Sidebar Menu

**File**: `views/pages/admin/dashboard.ejs` (and other admin pages)

**Current Menu**:

- Dashboard
- Buat Invoice
- Riwayat Invoice
- Logout

**Add New Menu Item**:

```ejs
<a href="/admin/new-page" class="nav-item">
  <span class="icon">🆕</span>
  <span class="label">Halaman Baru</span>
</a>
```

---

### 5. Change Status Options

**Current Status**:

- draft → Draf
- issued → Diterbitkan
- sent → Terkirim
- paid → Dibayar
- overdue → Jatuh Tempo
- cancelled → Dibatalkan

**To Add New Status**:

1. Update database:

   ```sql
   ALTER TABLE invoices
   MODIFY COLUMN status ENUM(..., 'new_status');
   ```

2. Update controllers & views

3. Update CSS for new badge color

---

### 6. Add Email Notifications

**Future Feature** - How to implement:

```javascript
// Install: npm install nodemailer
const nodemailer = require("nodemailer")

// Setup transporter
const transporter = nodemailer.createTransport({
	service: "gmail",
	auth: { user: "your-email", pass: "your-app-password" },
})

// Send when invoice created/shared
await transporter.sendMail({
	to: invoice.recipient_email,
	subject: `Invoice ${invoice.invoice_number}`,
	html: `<a href="${shareLink}">View Invoice</a>`,
})
```

---

### 7. Add Recurring Invoices

**Future Feature** - Concept:

```sql
-- New table
CREATE TABLE recurring_invoices (
  id INT,
  template_invoice_id VARCHAR(36),
  frequency ENUM('weekly', 'monthly', 'yearly'),
  next_date DATE,
  status ENUM('active', 'paused')
);

-- Cron job to auto-generate invoices
```

---

## 🔐 Security Considerations

### Current Security

- ✅ Session-based authentication
- ✅ Password hashing (bcrypt)
- ✅ CSRF protection via session secret
- ✅ Input sanitization (express-validator ready)

### To Enhance

- Add rate limiting for login attempts
- Implement HTTPS requirement
- Add 2FA for admin accounts
- Encrypt sensitive data fields
- Regular security audits
- SQL injection prevention (already using prepared statements)

---

## 📊 Performance Tips

1. **Database Indexes**

   - Already added on: invoice_number, share_token, status
   - Consider adding on: company_id, recipient_phone

2. **Pagination**

   - Limit: 20 per page (adjustable)
   - Use LIMIT/OFFSET in queries

3. **Caching** (Future)

   - Cache dashboard stats (Redis)
   - Cache static assets
   - Cache template compilation

4. **Lazy Loading**
   - Load images on demand
   - Lazy pagination

---

## 🎓 Learning Resources

- Express.js: https://expressjs.com/
- EJS Templates: https://ejs.co/
- PDFKit: http://pdfkit.org/
- MySQL: https://dev.mysql.com/
- Bootstrap (optional): https://getbootstrap.com/

---

**End of Features Documentation**

Last Updated: December 25, 2025
Version: 1.0.0
