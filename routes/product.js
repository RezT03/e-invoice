// routes/product.js
const express = require("express")
const router = express.Router()
const productController = require("../controllers/productController")

// Daftar produk
router.get("/", productController.getProducts)

// Buat produk
router.get("/create", productController.showCreateForm)
router.post("/create", productController.createProduct)

// Edit / update / toggle / delete
router.get("/:id/edit", productController.showEditForm)
router.post("/:id/update", productController.updateProduct)
router.post("/:id/toggle", productController.toggleProductActive)
router.post("/:id/delete", productController.deleteProduct)

module.exports = router
