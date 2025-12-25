# E-Invoice System - Restu Production

Aplikasi manajemen invoice berbasis web dengan fitur shared link, PDF generation, dan admin dashboard interaktif.

## 🚀 Fitur Utama

### User (Publik)

- ✅ **Cek Invoice**: Form untuk mencari invoice dengan nomor invoice dan nomor telepon penerima
- ✅ **Akses Shared Link**: Akses invoice melalui shared link yang dibagikan oleh admin
- ✅ **Download PDF**: Unduh invoice dalam format PDF
- ✅ **Tampilan Responsif**: Desain yang mobile-friendly

### Admin

- ✅ **Dashboard Interaktif**: Statistik invoice dengan sidebar menu
- ✅ **Buat Invoice**: Form lengkap untuk membuat invoice dengan support multiple template/logo
- ✅ **Kelola Invoice**: Edit, update status, dan hapus invoice
- ✅ **Generate Share Link**: Buat link sharing untuk invoice
- ✅ **Riwayat Invoice**: List semua invoice dengan pagination dan search
- ✅ **Multiple Template**: Support template normal dan dot matrix dengan logo berbeda

## 📋 Persyaratan Sistem

- Node.js >= 14.x
- MySQL >= 5.7
- npm atau yarn

## 💾 Instalasi

### 1. Clone Repository

```bash
git clone <repository-url>
cd e-invoice
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Database

- Buat database MySQL baru:

```sql
CREATE DATABASE e_invoice;
```

- Import schema:

```bash
mysql -u root -p e_invoice < db/schema.sql
```

### 4. Konfigurasi Environment

Buat file `.env` berdasarkan `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` dengan konfigurasi database Anda:

```env
DB_HOST=localhost
DB_USER=root
DB_PASS=password
DB_NAME=e_invoice
DB_PORT=3306
SESSION_SECRET=your-secret-key-here
```

### 5. Jalankan Aplikasi

```bash
# Development
npm run dev

# Production
npm start
```

Aplikasi akan berjalan di `http://localhost:3000`

## 🔐 Login Default

Setelah menjalankan schema SQL, gunakan akun default:

- **Username**: admin
- **Password**: admin123

**⚠️ Penting**: Ubah password admin pada login pertama!

## 📁 Struktur Direktori

```
├── app.js                    # Entry point aplikasi
├── package.json
├── .env.example
├── db/
│   ├── connection.js         # Konfigurasi database
│   └── schema.sql            # Database schema
├── middleware/
│   └── auth.js              # Middleware authentication
├── controllers/
│   ├── authController.js     # Controller auth
│   ├── adminInvoiceController.js  # Controller invoice admin
│   └── userInvoiceController.js   # Controller invoice user
├── routes/
│   ├── auth.js              # Route auth
│   ├── adminInvoice.js      # Route admin invoice
│   └── userInvoice.js       # Route user invoice
├── public/
│   ├── css/
│   │   ├── style.css        # General CSS
│   │   └── admin-style.css  # Admin dashboard CSS
│   ├── img/                 # Folder untuk logo
│   └── js/
├── views/
│   ├── layouts/
│   │   └── main.ejs
│   ├── pages/
│   │   ├── auth/
│   │   │   └── login.ejs
│   │   ├── user/
│   │   │   ├── check-invoice.ejs
│   │   │   └── invoice-view.ejs
│   │   └── admin/
│   │       ├── dashboard.ejs
│   │       ├── create-invoice.ejs
│   │       ├── invoice-history.ejs
│   │       └── invoice-detail.ejs
│   └── partials/
│       └── footer.ejs
└── pdf_templates/
    ├── normalTemplate.js
    └── dotMatrixTemplate.js
```

## 🌐 Routing

### Public Routes

- `GET /` - Halaman cek invoice
- `GET/POST /invoice/check` - Form & proses cek invoice
- `GET /invoice/share/:shareToken` - Akses invoice via shared link
- `GET /invoice/share/:shareToken/pdf` - Download PDF via shared link

### Auth Routes

- `GET /auth/login` - Halaman login
- `POST /auth/login` - Proses login
- `GET /auth/logout` - Logout

### Admin Routes (Protected)

- `GET /admin/invoice/dashboard` - Dashboard admin
- `GET/POST /admin/invoice/create` - Buat invoice
- `GET /admin/invoice/history` - Riwayat invoice
- `GET /admin/invoice/:uuid` - Detail invoice
- `POST /admin/invoice/:uuid/update` - Update invoice
- `POST /admin/invoice/:uuid/status` - Update status
- `POST /admin/invoice/:uuid/generate-share` - Generate share link
- `DELETE /admin/invoice/:uuid/delete` - Hapus invoice
- `GET /admin/invoice/:uuid/pdf/:type` - Download PDF

## 📝 Menambah Logo/Template

### 1. Upload Logo ke Folder

Tempat logo di: `public/img/`
Contoh: `public/img/logo-perusahaan.png`

### 2. Buat Template di Database

```sql
INSERT INTO invoice_templates (company_id, name, logo_path, template_type)
VALUES (1, 'Template Baru', '/img/logo-perusahaan.png', 'normal');
```

Atau melalui admin panel di form "Buat Invoice", akan menampilkan template yang tersedia.

## 🔧 Fitur Invoice

### Data Invoice

- Nomor invoice (unique)
- Tanggal invoice & jatuh tempo
- Data penerima (nama, telepon, NPWP, alamat)
- Daftar item/barang dengan qty & harga
- Pajak & biaya tambahan
- Total amount (otomatis dihitung)
- Status (draft, issued, sent, paid, overdue, cancelled)

### Share Features

- Generate share token untuk setiap invoice
- Akses invoice tanpa login via shared link
- Track akses dan log sharing

## 🎨 Desain & Styling

- **Admin Dashboard**: Sidebar navigation, cards layout, responsive grid
- **User Interface**: Minimal animasi, fokus pada function, responsive design
- **Color Scheme**:
  - Primary: #667eea (Purple Blue)
  - Secondary: #764ba2 (Dark Purple)
  - Accent: #28a745 (Green), #dc3545 (Red)

## 📱 Responsive Design

Aplikasi fully responsive untuk:

- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (< 768px)

## 🔒 Keamanan

- Session-based authentication
- Password hashing dengan bcrypt
- Input sanitization dengan express-validator
- CSRF protection via session secret
- Environment variables untuk sensitive data

## 📄 Format PDF

Mendukung dua format PDF:

1. **Normal Template** - Format standar profesional
2. **Dot Matrix Template** - Format untuk printer dot matrix

Kedua template dapat di-customize dengan logo berbeda.

## 🚧 Development

### Database Migrations

Semua table dan default data sudah termasuk di `db/schema.sql`

### Generate PDF

PDF generation menggunakan library PDFKit. Customize template di:

- `pdf_templates/normalTemplate.js`
- `pdf_templates/dotMatrixTemplate.js`

## 🐛 Troubleshooting

### Koneksi Database Gagal

- Pastikan MySQL server berjalan
- Check konfigurasi `.env`
- Pastikan database dan user sudah dibuat

### Admin tidak bisa login

- Reset password admin di database:

```bash
npm run reset-admin-password
```

### PDF tidak tergenerate

- Ensure PDFKit sudah installed: `npm install pdfkit`
- Check folder permissions untuk public/img

## 📞 Support

Untuk pertanyaan atau issue, silakan hubungi developer.

## 📄 License

MIT License - Lihat LICENSE file untuk detail

---

**v1.0.0** - Restu Production
