// adminInvoice.js
const express = require("express")
const router = express.Router()
const adminInvoiceController = require("../controllers/adminInvoiceController")

// Dashboard
router.get("/dashboard", adminInvoiceController.getDashboard)

// Invoice management
router.get("/create", adminInvoiceController.showCreateForm)
router.post("/create", adminInvoiceController.createInvoice)
router.get("/history", adminInvoiceController.getInvoiceHistory)

// AJAX untuk get templates by company - HARUS DI ATAS /:uuid
router.get("/templates/:companyId", adminInvoiceController.getTemplatesByCompany)

// Routes dengan UUID - urutan penting!
router.get("/:uuid/data", adminInvoiceController.getInvoiceData)
router.get("/:uuid/pdf/:type", adminInvoiceController.downloadPDF)
router.get("/:uuid/edit", adminInvoiceController.getInvoiceData)
router.post("/:uuid/update", adminInvoiceController.updateInvoice)
router.post("/:uuid/status", adminInvoiceController.updateStatus)
router.post("/:uuid/generate-share", adminInvoiceController.generateShareLink)
router.delete("/:uuid/delete", adminInvoiceController.deleteInvoice)
router.post("/:uuid/convert-to-invoice", adminInvoiceController.convertToInvoice)

// Rekening perusahaan multi + opsi PDF normal
router.get("/:uuid/bank-accounts", adminInvoiceController.getBankAccounts)
router.post("/:uuid/bank-accounts", adminInvoiceController.createBankAccount)
router.put("/:uuid/bank-accounts/:accountId", adminInvoiceController.updateBankAccount)
router.delete("/:uuid/bank-accounts/:accountId", adminInvoiceController.deleteBankAccount)
router.post("/:uuid/pdf-options", adminInvoiceController.savePdfOptions)

router.get("/:uuid", adminInvoiceController.viewInvoiceAdmin) // HARUS PALING BAWAH

module.exports = router