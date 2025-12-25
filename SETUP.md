# 🚀 QUICK START GUIDE - E-Invoice System

## Langkah-Langkah Setup Cepat

### 1️⃣ Database Setup

```sql
-- 1. Buat database
CREATE DATABASE e_invoice;

-- 2. Import schema
mysql -u root -p e_invoice < db/schema.sql

-- 3. Verify tables created
-- admins, companies, invoices, invoice_templates, invoice_shares
```

### 2️⃣ Konfigurasi Aplikasi

```bash
# 1. Buat file .env
cp .env.example .env

# 2. Edit .env dengan detail database Anda
nano .env
# Atau gunakan editor favorit Anda

# Pastikan ini sesuai:
DB_HOST=localhost        # Host MySQL
DB_USER=root             # User MySQL
DB_PASS=password         # Password MySQL
DB_NAME=e_invoice        # Database name
DB_PORT=3306             # MySQL port (biasanya 3306)
PORT=3000                # Port aplikasi
SESSION_SECRET=qqqqqqq   # Ganti dengan random string
```

### 3️⃣ Install & Run

```bash
# Install dependencies
npm install

# Development mode (dengan auto-reload)
npm run dev

# Atau Production mode
npm start

# Aplikasi berjalan di http://localhost:3000
```

### 4️⃣ Login Pertama Kali

```
URL: http://localhost:3000/auth/login

Default Login:
- Username: admin
- Password: admin123

⚠️ PENTING: Ubah password setelah login pertama!
```

---

## 📋 Struktur Folder

```
e-invoice/
├── app.js                      # Main server file
├── package.json
├── .env                        # Konfigurasi (create dari .env.example)
├── .env.example
├── README.md
├── CHANGELOG.md
│
├── db/
│   ├── connection.js           # Database connection pool
│   └── schema.sql              # Database schema & default data
│
├── middleware/
│   └── auth.js                 # Authentication middleware
│
├── controllers/
│   ├── authController.js       # Auth logic
│   ├── adminInvoiceController.js  # Admin invoice CRUD
│   └── userInvoiceController.js   # Public invoice access
│
├── routes/
│   ├── auth.js                 # /auth routes
│   ├── adminInvoice.js         # /admin/invoice routes
│   └── userInvoice.js          # /invoice routes
│
├── public/
│   ├── css/
│   │   ├── style.css           # General styling
│   │   └── admin-style.css     # Admin dashboard styling
│   ├── img/                    # Put logos here
│   └── js/                     # JavaScript files
│
├── views/
│   ├── pages/
│   │   ├── auth/
│   │   │   └── login.ejs
│   │   ├── user/
│   │   │   ├── check-invoice.ejs     # User form untuk cek invoice
│   │   │   └── invoice-view.ejs      # Invoice detail view
│   │   └── admin/
│   │       ├── dashboard.ejs         # Admin dashboard
│   │       ├── create-invoice.ejs    # Form buat invoice
│   │       ├── invoice-history.ejs   # List invoice
│   │       └── invoice-detail.ejs    # Invoice detail + edit
│   ├── partials/
│   └── layouts/
│
└── pdf_templates/
    ├── normalTemplate.js       # Normal invoice template
    └── dotMatrixTemplate.js    # Dot matrix template
```

---

## 🌐 URL Map

| URL                        | Tipe   | Deskripsi                    |
| -------------------------- | ------ | ---------------------------- |
| `/`                        | Public | Home - form cek invoice      |
| `/invoice/check`           | Public | Submit form cek invoice      |
| `/invoice/share/:token`    | Public | Lihat invoice via share link |
| `/auth/login`              | Public | Login page                   |
| `/admin/invoice/dashboard` | Admin  | Dashboard                    |
| `/admin/invoice/create`    | Admin  | Form buat invoice            |
| `/admin/invoice/history`   | Admin  | List semua invoice           |
| `/admin/invoice/:id`       | Admin  | Detail invoice               |

---

## 📊 Database Struktur

### Table: admins

```
id (int) - Primary key
username (varchar) - Unique
password (varchar) - Hashed with bcrypt
email (varchar)
created_at, updated_at
```

### Table: companies

```
id, name, address, phone, email, npwp
bank_name, bank_account_number, bank_account_name
```

### Table: invoice_templates

```
id, company_id, name, logo_path
template_type (normal/dot_matrix)
```

### Table: invoices

```
id (UUID), invoice_number (unique)
company_id, template_id
recipient_name, recipient_phone, recipient_npwp, recipient_address
invoice_date, due_date
items (JSON), taxes (JSON), total_amount
status (draft/issued/sent/paid/overdue/cancelled)
paid_date, share_token
```

---

## 🎨 Default Admin Login

Setelah menjalankan `schema.sql`, gunakan:

- **Username**: admin
- **Password**: admin123

Ubah password ini setelah login pertama untuk keamanan!

---

## 📝 Menambah Logo

1. **Put file gambar di**: `public/img/`

   - Contoh: `public/img/logo-perusahaan.png`

2. **Update di database**:

   ```sql
   UPDATE invoice_templates
   SET logo_path = '/img/logo-perusahaan.png'
   WHERE id = 1;
   ```

3. **Atau via Admin Panel**:
   - Edit invoice, pilih template dengan logo baru

---

## 🔍 Troubleshooting

### ❌ Error: "Cannot find module 'express'"

```bash
# Solution:
npm install
```

### ❌ Error: "connect ECONNREFUSED 127.0.0.1:3306"

- Check MySQL server status: `mysql -u root -p`
- Verify .env DB credentials
- Pastikan port 3306 benar

### ❌ Error: "Table 'e_invoice.invoices' doesn't exist"

```bash
# Run schema import again:
mysql -u root -p e_invoice < db/schema.sql
```

### ❌ Admin login tidak bisa

- Verify admin user exists:
  ```sql
  SELECT * FROM admins;
  ```
- Password default: `admin123`
- Jika lupa password, reset via SQL:
  ```sql
  UPDATE admins SET password = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcg7b3XeKeUxWdeS86E36MM4PoC' WHERE username='admin';
  ```

---

## 📱 Akses dari Mobile/Device Lain

Jika akses dari device lain di network yang sama:

- Gunakan IP server: `http://192.168.x.x:3000`
- Pastikan firewall allow port 3000

---

## 🎯 Next Steps Setelah Setup

1. ✅ Login dengan akun admin
2. ✅ Ubah password admin
3. ✅ Buat company (jika belum ada)
4. ✅ Buat/upload logo di `public/img/`
5. ✅ Create invoice template dengan logo
6. ✅ Buat invoice pertama
7. ✅ Test share link
8. ✅ Test download PDF

---

## 🔒 Keamanan Tips

- ✅ Ubah password admin default
- ✅ Set SESSION_SECRET yang kuat di .env
- ✅ Use HTTPS di production
- ✅ Regular backup database
- ✅ Limit akses file database
- ✅ Keep Node.js & dependencies updated

---

## 📞 Need Help?

Refer ke:

- `README.md` - Full documentation
- `CHANGELOG.md` - Detailed changes
- Check browser console untuk error messages
- Check server logs saat run: `npm run dev`

---

**Happy coding! 🎉**
