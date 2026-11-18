const express = require("express")
const path = require("path")
const session = require("express-session")
const bodyParser = require("body-parser")
const dotenv = require("dotenv")

dotenv.config()

const app = express()
const userInvoiceRoutes = require("./routes/userInvoice")
const adminInvoiceRoutes = require("./routes/adminInvoice")
const bookingRoutes = require("./routes/booking")
const productRoutes = require("./routes/product")
const customerRoutes = require("./routes/customer")
const deliveryRoutes = require("./routes/delivery")
const paymentRoutes = require("./routes/payment")
const authRoutes = require("./routes/auth")
const { checkAdminAuth } = require("./middleware/auth")

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname, "public")))
app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))

app.use(
	session({
		secret: process.env.SESSION_SECRET || "secret_key",
		resave: false,
		saveUninitialized: true,
	}),
)

// Routes
app.use("/auth", authRoutes)
app.use("/invoice", userInvoiceRoutes)
app.use("/admin/invoice", checkAdminAuth, adminInvoiceRoutes)
app.use("/admin/bookings", checkAdminAuth, bookingRoutes)
app.use("/admin/products", checkAdminAuth, productRoutes)
app.use("/admin/customers", checkAdminAuth, customerRoutes)
app.use("/admin/deliveries", checkAdminAuth, deliveryRoutes)
app.use("/admin/payments", checkAdminAuth, paymentRoutes)

// Home route - redirect ke invoice check
app.get("/", (req, res) => {
	res.render("pages/user/check-invoice", { error: null, success: null })
})

// Admin dashboard
app.get("/dashboard", checkAdminAuth, (req, res) => {
	res.redirect("/admin/invoice/dashboard")
})
// Admin create route (accessible at /create)
app.get("/create", checkAdminAuth, (req, res) => {
	res.redirect("/admin/invoice/create")
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
