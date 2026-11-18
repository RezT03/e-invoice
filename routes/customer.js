// routes/customer.js
const express = require("express")
const router = express.Router()
const customerController = require("../controllers/customerController")

// Daftar pelanggan
router.get("/", customerController.getCustomers)

// Buat pelanggan
router.get("/create", customerController.showCreateForm)
router.post("/create", customerController.createCustomer)

// Edit / update / toggle / delete
router.get("/:id/edit", customerController.showEditForm)
router.post("/:id/update", customerController.updateCustomer)
router.post("/:id/toggle", customerController.toggleCustomerActive)
router.post("/:id/delete", customerController.deleteCustomer)

module.exports = router
