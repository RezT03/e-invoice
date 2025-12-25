-- Database Schema untuk E-Invoice System
-- Created for Restu Production

-- Tabel untuk admin users
CREATE TABLE IF NOT EXISTS admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabel untuk perusahaan
CREATE TABLE IF NOT EXISTS companies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(100),
  npwp VARCHAR(20),
  bank_name VARCHAR(100),
  bank_account_number VARCHAR(30),
  bank_account_name VARCHAR(255),
  logo_path VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabel untuk template invoice (dengan pilihan logo)
CREATE TABLE IF NOT EXISTS invoice_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  company_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  logo_path VARCHAR(255),
  template_type ENUM('normal', 'dot_matrix') DEFAULT 'normal',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  UNIQUE KEY unique_company_template (company_id, name)
);

-- Tabel untuk invoice
CREATE TABLE IF NOT EXISTS invoices (
  id VARCHAR(36) PRIMARY KEY,
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  company_id INT NOT NULL,
  template_id INT,
  recipient_name VARCHAR(255) NOT NULL,
  recipient_phone VARCHAR(20) NOT NULL,
  recipient_npwp VARCHAR(20),
  recipient_address TEXT,
  invoice_date DATE NOT NULL,
  due_date DATE,
  items JSON,
  taxes JSON,
  total_amount DECIMAL(15, 2),
  status ENUM('draft', 'issued', 'sent', 'paid', 'overdue', 'cancelled') DEFAULT 'draft',
  paid_date DATETIME,
  share_token VARCHAR(255) UNIQUE,
  share_token_created_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES invoice_templates(id) ON DELETE SET NULL,
  INDEX idx_invoice_number (invoice_number),
  INDEX idx_share_token (share_token),
  INDEX idx_status (status),
  INDEX idx_company_id (company_id)
);

-- Tabel untuk share logs (tracking akses shared link)
CREATE TABLE IF NOT EXISTS invoice_shares (
  id INT AUTO_INCREMENT PRIMARY KEY,
  invoice_id VARCHAR(36) NOT NULL,
  share_token VARCHAR(255) UNIQUE NOT NULL,
  recipient_phone_verified VARCHAR(20),
  accessed_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME,
  FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
  INDEX idx_share_token (share_token),
  INDEX idx_invoice_id (invoice_id)
);

-- Insert admin default (username: admin, password: admin123)
-- Password hash generated with bcrypt rounds:10
INSERT INTO admins (username, password, email) 
VALUES ('admin', '$2b$10$76iqzJJEC4dx5rNlUztTb.Mu7kVEt6Eac3ubl4tl9VsnYuycNfNkO', 'admin@restupro.com')
ON DUPLICATE KEY UPDATE username = username;

-- Insert default company
INSERT INTO companies (name, address, phone, email, npwp, bank_name, bank_account_number, bank_account_name) 
VALUES ('Restu Production', 'Jl. Contoh No. 123', '+62812345678', 'info@restupro.com', '12.345.678.9-012.000', 'Bank BCA', '1234567890', 'PT. Restu Production')
ON DUPLICATE KEY UPDATE name = name;

-- Insert default templates
INSERT INTO invoice_templates (company_id, name, description, logo_path, template_type) 
VALUES 
(1, 'Normal Template', 'Template invoice normal dengan logo standard', '/img/logo-default.png', 'normal'),
(1, 'Dot Matrix Template', 'Template untuk printer dot matrix', '/img/logo-default.png', 'dot_matrix')
ON DUPLICATE KEY UPDATE name = name;
