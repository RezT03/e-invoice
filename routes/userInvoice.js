const express = require("express")
const router = express.Router()
const userInvoiceController = require("../controllers/userInvoiceController")

// Halaman cek invoice dengan form
router.get("/check", userInvoiceController.showCheckInvoice)
router.post("/check", userInvoiceController.checkInvoice)

// Download PDF dari check invoice
router.post("/check/pdf", userInvoiceController.downloadPDFFromCheck)

// Akses invoice melalui shared link
router.get("/share/:shareToken", userInvoiceController.viewSharedInvoice)

// Download PDF melalui shared link
router.get("/share/:shareToken/pdf", userInvoiceController.downloadPDF)

module.exports = router
