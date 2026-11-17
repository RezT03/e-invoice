-- Migration: Add document_type and quotation statuses to invoices table
ALTER TABLE invoices 
  MODIFY COLUMN status ENUM('draft', 'issued', 'sent', 'paid', 'overdue', 'cancelled', 'accepted', 'rejected') DEFAULT 'draft',
  ADD COLUMN document_type ENUM('invoice', 'quotation') DEFAULT 'invoice' AFTER status,
  ADD INDEX idx_document_type (document_type);
