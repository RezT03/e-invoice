-- Script untuk FIX password admin
-- Password yang benar untuk username: admin dengan password: admin123
-- Hash: $2b$10$76iqzJJEC4dx5rNlUztTb.Mu7kVEt6Eac3ubl4tl9VsnYuycNfNkO

UPDATE admins 
SET password = '$2b$10$76iqzJJEC4dx5rNlUztTb.Mu7kVEt6Eac3ubl4tl9VsnYuycNfNkO' 
WHERE username = 'admin';

-- Verify hasil update
SELECT id, username, email, password FROM admins WHERE username = 'admin';
