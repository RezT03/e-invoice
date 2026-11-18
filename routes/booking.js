// routes/booking.js
const express = require("express")
const router = express.Router()
const bookingController = require("../controllers/bookingController")

// Daftar booking
router.get("/", bookingController.getBookings)

// Buat booking
router.get("/create", bookingController.showCreateForm)
router.post("/create", bookingController.createBooking)

// Edit / update / delete / resync
router.get("/:id/edit", bookingController.showEditForm)
router.post("/:id/update", bookingController.updateBooking)
router.post("/:id/delete", bookingController.deleteBooking)
router.post("/:id/sync", bookingController.resyncBooking)

module.exports = router
