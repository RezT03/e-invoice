// routes/delivery.js
const express = require("express")
const router = express.Router()
const deliveryController = require("../controllers/deliveryController")

// Daftar surat jalan
router.get("/", deliveryController.getDeliveries)

// Buat surat jalan
router.get("/create", deliveryController.showCreateForm)
router.post("/create", deliveryController.createDelivery)

// Edit / update / status / delete
router.get("/:id/edit", deliveryController.showEditForm)
router.get("/:id/pdf", deliveryController.downloadDeliveryPDF)
router.post("/:id/update", deliveryController.updateDelivery)
router.post("/:id/status", deliveryController.updateDeliveryStatus)
router.post("/:id/delete", deliveryController.deleteDelivery)

module.exports = router
