const express = require("express")
const router = express.Router()
const adminInvoiceController = require("../controllers/adminInvoiceController")

// Dashboard
router.get("/dashboard", adminInvoiceController.getDashboard)

// Invoice management
router.get("/create", adminInvoiceController.showCreateForm)
router.post("/create", adminInvoiceController.createInvoice)
router.get("/history", adminInvoiceController.getInvoiceHistory)
router.get("/:uuid", adminInvoiceController.viewInvoiceAdmin)
router.post("/:uuid/update", adminInvoiceController.updateInvoice)
router.post("/:uuid/status", adminInvoiceController.updateStatus)
router.delete("/:uuid/delete", adminInvoiceController.deleteInvoice)

// PDF download
router.get("/:uuid/pdf/:type", adminInvoiceController.downloadPDF)

// Share link generation
router.post("/:uuid/generate-share", adminInvoiceController.generateShareLink)

// AJAX untuk get templates by company
router.get(
	"/templates/:companyId",
	adminInvoiceController.getTemplatesByCompany,
)

module.exports = router
