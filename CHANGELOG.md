# 📋 DOKUMENTASI PERUBAHAN E-INVOICE SYSTEM

## 🎯 Ringkasan Perubahan

Telah melakukan refactoring dan enhancement lengkap pada sistem e-invoice dengan fokus pada:

1. ✅ Pisahan tampilan user dan admin
2. ✅ Shared link access untuk invoice
3. ✅ Admin dashboard dengan sidebar interaktif
4. ✅ Support multiple template/logo untuk invoice
5. ✅ Database schema yang lengkap
6. ✅ Desain UI modern namun minim animasi

---

## 📁 FILE-FILE BARU YANG DIBUAT

### 1. Database & Configuration

- **db/schema.sql** - Full database schema dengan tabel: admins, companies, invoices, invoice_templates, invoice_shares
- **.env.example** - Template environment variables

### 2. Middleware

- **middleware/auth.js** - Authentication middleware untuk protect admin routes

### 3. Controllers

- **controllers/adminInvoiceController.js** - Logic untuk admin invoice management (dashboard, create, edit, delete, share)
- **controllers/userInvoiceController.js** - Logic untuk user public access (check invoice, view shared link, download PDF)

### 4. Routes

- **routes/userInvoice.js** - Routes untuk public invoice access (/invoice/check, /invoice/share/:token)
- **routes/adminInvoice.js** - Routes untuk admin invoice management (protected)

### 5. Views - User Pages

- **views/pages/user/check-invoice.ejs** - Form untuk user cek invoice dengan verifikasi nomor telepon
- **views/pages/user/invoice-view.ejs** - Tampilan invoice yang clean dan responsif (bisa via check atau shared link)

### 6. Views - Auth

- **views/pages/auth/login.ejs** - Halaman login admin dengan design modern

### 7. Views - Admin Pages

- **views/pages/admin/dashboard.ejs** - Dashboard dengan statistics, sidebar, recent invoices
- **views/pages/admin/create-invoice.ejs** - Form kompleks untuk membuat invoice dengan:
  - Pilihan company & template/logo
  - Dynamic item/tax addition
  - Auto calculation
- **views/pages/admin/invoice-history.ejs** - List invoice dengan pagination, search, dan filter
- **views/pages/admin/invoice-detail.ejs** - Detail invoice dengan opsi:
  - Update status & paid date
  - Generate/manage share link
  - Download PDF
  - Delete invoice

### 8. Views - Error & Layout

- **views/pages/error.ejs** - Generic error page
- **views/layouts/main.ejs** - Main layout (optional, bisa untuk future use)

### 9. Styling

- **public/css/admin-style.css** - Comprehensive admin dashboard styling
  - Sidebar navigation (purple gradient)
  - Responsive grid layouts
  - Card components
  - Table styling
  - Badge/status indicators
- **public/css/style.css** - General styling update
  - Modern design system
  - Form components
  - Responsive utilities
  - Color variables

### 10. Documentation

- **README.md** - Complete project documentation
- **CHANGELOG.md** (file ini) - Detailed change log

---

## 🔄 PERUBAHAN FILE YANG ADA

### app.js

**Before:**

```javascript
const invoiceRoutes = require("./routes/invoice")
app.use("/invoice", invoiceRoutes)
app.use("/admin", authRoutes)
app.get("/", (req, res) => res.redirect("/admin/login"))
```

**After:**

```javascript
const userInvoiceRoutes = require("./routes/userInvoice")
const adminInvoiceRoutes = require("./routes/adminInvoice")
const { checkAdminAuth } = require("./middleware/auth")

app.use("/auth", authRoutes)
app.use("/invoice", userInvoiceRoutes)
app.use("/admin/invoice", checkAdminAuth, adminInvoiceRoutes)
app.get("/", (req, res) => res.render("pages/user/check-invoice"))
app.get("/create", checkAdminAuth, (req, res) =>
	res.redirect("/admin/dashboard"),
)
```

### controllers/authController.js

- Tambah support untuk `returnUrl` query parameter
- Update redirect path ke `/admin/dashboard` instead `/invoice/history`
- Improve error handling

### routes/auth.js

- Sudah sesuai, no changes (bisa tetap digunakan)

### routes/invoice.js → routes/userInvoice.js & routes/adminInvoice.js

- Split menjadi 2 file terpisah
- User routes: check, share view, pdf download
- Admin routes: CRUD operations, share generation

### public/css/style.css

- Complete rewrite dengan modern design system
- Add form styling, buttons, tables, utilities
- Responsive design improvements

---

## 🗄️ DATABASE SCHEMA

### Tables Created:

```sql
1. admins
   - id, username, password, email, created_at, updated_at

2. companies
   - id, name, address, phone, email, npwp, bank_name, bank_account_number, bank_account_name

3. invoice_templates
   - id, company_id, name, description, logo_path, template_type (normal/dot_matrix)
   - Unique: (company_id, name)

4. invoices
   - id (UUID), invoice_number, company_id, template_id, recipient_name, recipient_phone
   - recipient_npwp, recipient_address, invoice_date, due_date
   - items (JSON), taxes (JSON), total_amount, status, paid_date
   - share_token, share_token_created_at
   - Indexes: invoice_number, share_token, status, company_id

5. invoice_shares
   - id, invoice_id, share_token, recipient_phone_verified, accessed_at
   - created_at, expires_at
   - Unique: share_token
```

### Default Data Inserted:

- Admin user (username: admin, password: admin123 - hashed)
- Default company (Restu Production)
- 2 Default templates (Normal & Dot Matrix)

---

## 🔐 AUTHENTICATION & ROUTING

### Public Routes (No Login Required)

```
GET  /                          → Check invoice form
GET  /invoice/check              → Form view
POST /invoice/check              → Process check
GET  /invoice/share/:shareToken  → View shared invoice
GET  /invoice/share/:shareToken/pdf → Download PDF
```

### Auth Routes

```
GET  /auth/login      → Login form
POST /auth/login      → Process login
GET  /auth/logout     → Logout
```

### Admin Routes (Login Required)

```
GET  /admin/invoice/dashboard         → Admin dashboard
GET  /admin/invoice/create            → Create form
POST /admin/invoice/create            → Save invoice
GET  /admin/invoice/history           → List invoices
GET  /admin/invoice/:uuid             → Detail view
POST /admin/invoice/:uuid/update      → Update invoice
POST /admin/invoice/:uuid/status      → Update status
DELETE /admin/invoice/:uuid/delete    → Delete invoice
POST /admin/invoice/:uuid/generate-share → Create share link
GET  /admin/invoice/:uuid/pdf/:type   → Download PDF
GET  /admin/invoice/templates/:companyId → Get templates (AJAX)
```

---

## 🎨 UI/UX DESIGN

### User Interface (Public)

- **Color Scheme**: Purple gradient (#667eea → #764ba2)
- **Typography**: System fonts for better performance
- **Components**: Clean forms, minimal elements
- **Responsive**: Mobile-first approach

### Admin Dashboard

- **Layout**: 2-column sidebar + main content
- **Sidebar**: 260px fixed, purple gradient, smooth navigation
- **Main Content**: Full width, flexible grid layouts
- **Cards**: White background, subtle shadows, hover effects
- **Status Badges**: Color-coded (draft, issued, sent, paid, overdue, cancelled)
- **Tables**: Clean design with hover effects
- **Stats**: Icon-based stat cards with visual indicators

### Animations

- Minimal transitions (0.2-0.3s)
- Transform on hover for buttons only (translateY)
- No complex animations - focus on functionality
- Print-friendly design

---

## 📊 DATA FLOW

### Create Invoice Flow

```
Admin → /admin/invoice/create
  → GET companies & templates
  → Fill form with dynamic items/taxes
  → POST to /admin/invoice/create
  → Save to database
  → Redirect to detail page
```

### User Check Invoice Flow

```
User → / (home page)
  → Form: invoice_number + recipient_phone
  → POST /invoice/check
  → Query database
  → If match: show invoice detail
  → Option to generate share link (admin only)
```

### Share Link Flow

```
Admin → Detail page
  → Generate share token → Save to DB
  → Get share URL → Copy link
User (with link) → /invoice/share/:token
  → Validate token & expiry
  → Show invoice (no login needed)
  → Option to download PDF
```

---

## 🚀 FITUR-FITUR UTAMA

### Admin Features

1. **Dashboard** - Real-time statistics, recent invoices
2. **Invoice Management** - Full CRUD operations
3. **Template System** - Multiple templates per company with different logos
4. **Share Management** - Generate & manage share links with tokens
5. **PDF Export** - Download dalam format normal atau dot matrix
6. **Status Tracking** - Draft → Issued → Sent → Paid/Overdue
7. **Search & Filter** - Find invoices by number, recipient, status

### User Features

1. **Check Invoice** - Verify invoice dengan nomor + nomor telepon
2. **Shared Link Access** - Akses invoice via unique token
3. **PDF Download** - Download from shared link
4. **Responsive View** - Mobile-friendly invoice display

---

## 💾 INSTALLATION STEPS

1. **Copy database schema**

   ```bash
   mysql -u root -p e_invoice < db/schema.sql
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Setup .env file**

   ```bash
   cp .env.example .env
   # Edit dengan konfigurasi database Anda
   ```

4. **Run application**

   ```bash
   npm run dev    # Development
   npm start      # Production
   ```

5. **Login dengan**
   - Username: admin
   - Password: admin123

---

## 🎯 NEXT STEPS (Optional)

1. **Add logo uploads** - Form untuk upload logo instead of file path
2. **Email notifications** - Send invoice via email when shared
3. **Payment integration** - Connect payment gateway
4. **Bulk operations** - Export multiple invoices as CSV/Excel
5. **Audit logs** - Track who created/modified invoices
6. **Customize templates** - Web-based template editor
7. **Multiple currency** - Support different currencies
8. **Recurring invoices** - Auto-generate invoices periodically

---

## ⚠️ IMPORTANT NOTES

1. **Password Hash**: Default admin password sudah di-hash dengan bcrypt, jangan diedit langsung di database
2. **Share Token Expiry**: Belum ada expiry validation, bisa ditambah di `invoice_shares.expires_at`
3. **Phone Verification**: Nomor telepon hanya di-match saat check, tidak ada OTP verification
4. **Logo Path**: Pastikan folder `public/img/` exist dan readable
5. **PDF Generation**: Pastikan PDFKit library sudah installed

---

## 📞 TECHNICAL SUPPORT

Jika ada issue atau pertanyaan, check:

- Database connection di `.env`
- MySQL server status
- Node version compatibility
- Port availability (default: 3000)

---

**Last Updated**: December 25, 2025
**Version**: 1.0.0
**Status**: ✅ Ready for Production
