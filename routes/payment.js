// routes/payment.js
const express = require("express")
const router = express.Router()
const paymentController = require("../controllers/paymentController")
const { uploadProof } = require("../utils/paymentUpload")

// Daftar pembayaran
router.get("/", paymentController.getPayments)

// Catat pembayaran (menerima unggahan bukti bayar)
router.get("/create", paymentController.showCreateForm)
router.post("/create", uploadProof, paymentController.createPayment)

// Edit / update / delete
router.get("/:id/edit", paymentController.showEditForm)
router.get("/:id/proof", paymentController.serveProof)
router.post("/:id/update", uploadProof, paymentController.updatePayment)
router.post("/:id/delete", paymentController.deletePayment)

module.exports = router
