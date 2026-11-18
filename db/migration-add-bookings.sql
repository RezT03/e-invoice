-- Migration: Modul Booking / Jadwal Event
-- Fitur fase 1: Booking + sinkronisasi Google Calendar (service account, tanpa OAuth)
-- Jalankan sekali: mysql -u <user> -p <db> < db/migration-add-bookings.sql

CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR(36) PRIMARY KEY,
  booking_number VARCHAR(100) UNIQUE NOT NULL,
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
  -- Hasil sinkronisasi Google Calendar (best-effort, tanpa OAuth)
  google_event_id VARCHAR(255),
  google_calendar_id VARCHAR(255),
  sync_status ENUM('pending', 'synced', 'failed', 'skipped') DEFAULT 'pending',
  sync_error TEXT,
  synced_at DATETIME,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_booking_number (booking_number),
  INDEX idx_event_start (event_start),
  INDEX idx_status (status)
);
