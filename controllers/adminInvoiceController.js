const db = require("../db/connection")
const { v4: uuidv4 } = require("uuid")
const generatePDF = require("../utils/pdfGenerator")
const crypto = require("crypto")

// ADMIN DASHBOARD
exports.getDashboard = async (req, res) => {
	try {
		// Statistik invoice
		const [stats] = await db.execute(`
      SELECT 
        COUNT(*) as total_invoices,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid,
        SUM(CASE WHEN status = 'issued' THEN 1 ELSE 0 END) as issued,
        SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) as overdue,
        SUM(total_amount) as total_value
      FROM invoices
    `)

		// Recent invoices
		const [recentInvoices] = await db.execute(`
      SELECT i.id, i.invoice_number, i.recipient_name, i.status, i.total_amount, i.invoice_date, c.name as company_name
      FROM invoices i
      JOIN companies c ON i.company_id = c.id
      ORDER BY i.created_at DESC
      LIMIT 10
    `)

		res.render("pages/admin/dashboard", {
			stats: stats[0] || {},
			recentInvoices,
		})
	} catch (error) {
		console.error("Dashboard error:", error)
		res.status(500).render("pages/admin/dashboard", {
			stats: {},
			recentInvoices: [],
			error: "Terjadi kesalahan saat memuat dashboard",
		})
	}
}

// FORM UNTUK BUAT INVOICE
exports.showCreateForm = async (req, res) => {
	try {
		const [companies] = await db.execute(
			"SELECT id, name FROM companies WHERE 1",
		)

		// Get all templates for selected company or first company
		const selectedCompanyId = companies[0]?.id || 1
		const [templates] = await db.execute(
			"SELECT id, name, logo_path, template_type FROM invoice_templates WHERE company_id = ?",
			[selectedCompanyId],
		)

		res.render("pages/admin/create-invoice", {
			companies,
			templates,
			selectedCompanyId,
		})
	} catch (error) {
		console.error("Create form error:", error)
		res.status(500).send("Terjadi kesalahan: " + error.message)
	}
}

// GET TEMPLATES BERDASARKAN COMPANY (AJAX)
exports.getTemplatesByCompany = async (req, res) => {
	try {
		const { companyId } = req.params
		const [templates] = await db.execute(
			"SELECT id, name, logo_path, template_type FROM invoice_templates WHERE company_id = ? AND is_active = TRUE",
			[companyId],
		)
		res.json(templates)
	} catch (error) {
		res.status(500).json({ error: error.message })
	}
}

// BUAT INVOICE BARU
exports.createInvoice = async (req, res) => {
	try {
		const id = uuidv4()
		const {
			invoice_number,
			recipient_name,
			recipient_phone,
			recipient_npwp,
			recipient_address,
			invoice_date,
			due_date,
			company_id,
			template_id,
			items,
			taxes,
			status = "draft",
		} = req.body

		// Parse items dan taxes
		let parsedItems = []
		let parsedTaxes = []
		let totalAmount = 0

		if (typeof items === "string") {
			parsedItems = JSON.parse(items)
		} else {
			parsedItems = items || []
		}

		if (typeof taxes === "string") {
			parsedTaxes = JSON.parse(taxes)
		} else {
			parsedTaxes = taxes || []
		}

		// Hitung subtotal dari items
		let subtotal = 0
		parsedItems.forEach((item) => {
			subtotal += (item.quantity || 0) * (item.price || 0)
		})

		// Hitung tax amount dari percentage
		const calculatedTaxes = parsedTaxes.map((tax) => ({
			...tax,
			amount: (subtotal * (tax.percentage || 0)) / 100,
		}))

		// Hitung total amount
		totalAmount = subtotal
		calculatedTaxes.forEach((tax) => {
			totalAmount += tax.amount || 0
		})

		await db.execute(
			`
      INSERT INTO invoices 
      (id, invoice_number, company_id, template_id, recipient_name, recipient_phone, recipient_npwp, 
       recipient_address, invoice_date, due_date, items, taxes, total_amount, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
			[
				id,
				invoice_number,
				company_id,
				null,
				recipient_name,
				recipient_phone,
				recipient_npwp || null,
				recipient_address || null,
				invoice_date,
				due_date || null,
				JSON.stringify(parsedItems),
				JSON.stringify(calculatedTaxes),
				totalAmount,
				status,
			],
		)

		res.json({ success: true, id, message: "Invoice berhasil dibuat" })
	} catch (error) {
		console.error("Create invoice error:", error)
		res.status(500).json({ success: false, error: error.message })
	}
}

// LIHAT DETAIL INVOICE (ADMIN)
exports.viewInvoiceAdmin = async (req, res) => {
	try {
		const { uuid } = req.params
		const [invoices] = await db.execute(
			`
      SELECT i.*, 
             c.name AS company_name, 
             c.address AS company_address, 
             c.phone AS company_phone,
             c.logo_path,
             c.bank_account_name, 
             c.bank_account_number, 
             c.bank_name,
             t.name as template_name,
             t.template_type
      FROM invoices i 
      JOIN companies c ON i.company_id = c.id
      LEFT JOIN invoice_templates t ON i.template_id = t.id
      WHERE i.id = ?
    `,
			[uuid],
		)

		if (invoices.length === 0) {
			return res
				.status(404)
				.render("pages/error", { message: "Invoice tidak ditemukan" })
		}

		const invoice = invoices[0]
		try {
			invoice.items =
				typeof invoice.items === "string"
					? JSON.parse(invoice.items)
					: invoice.items || []
			invoice.taxes =
				typeof invoice.taxes === "string"
					? JSON.parse(invoice.taxes)
					: invoice.taxes || []
		} catch (err) {
			invoice.items = []
			invoice.taxes = []
		}

		res.render("pages/admin/invoice-detail", { invoice, isAdmin: true })
	} catch (error) {
		console.error("View invoice error:", error)
		res.status(500).send("Terjadi kesalahan: " + error.message)
	}
}

// HISTORY/LIST INVOICE
exports.getInvoiceHistory = async (req, res) => {
	try {
		const page = req.query.page || 1
		const limit = 20
		const offset = (page - 1) * limit

		// Get filter parameters
		const search = req.query.search || ""
		const date = req.query.date || ""
		const status = req.query.status || ""

		// Build WHERE clause dynamically
		let whereClause = "WHERE 1=1"
		const params = []

		if (search) {
			whereClause += " AND (i.invoice_number LIKE ? OR i.recipient_name LIKE ?)"
			params.push(`%${search}%`, `%${search}%`)
		}

		if (date) {
			whereClause += " AND DATE(i.invoice_date) = ?"
			params.push(date)
		}

		if (status) {
			whereClause += " AND i.status = ?"
			params.push(status)
		}

		// Get filtered invoices with pagination
		const [rows] = await db.execute(
			`
      SELECT i.id, i.invoice_number, i.recipient_name, i.invoice_date, i.status, i.total_amount, c.name AS company_name
      FROM invoices i 
      JOIN companies c ON i.company_id = c.id 
      ${whereClause}
      ORDER BY i.created_at DESC
      LIMIT ? OFFSET ?
    `,
			[...params, limit, offset],
		)

		// Get total count with filters
		const [countResult] = await db.execute(
			`SELECT COUNT(*) as total FROM invoices i JOIN companies c ON i.company_id = c.id ${whereClause}`,
			params,
		)
		const totalInvoices = countResult[0].total
		const totalPages = Math.ceil(totalInvoices / limit)

		res.render("pages/admin/invoice-history", {
			invoices: rows,
			currentPage: parseInt(page),
			totalPages,
			totalInvoices,
			search,
			date,
			status,
		})
	} catch (error) {
		console.error("History error:", error)
		res.status(500).send("Terjadi kesalahan: " + error.message)
	}
}

// UPDATE INVOICE
exports.updateInvoice = async (req, res) => {
	try {
		const { uuid } = req.params
		const {
			recipient_name,
			recipient_phone,
			recipient_npwp,
			recipient_address,
			items,
			taxes,
			status,
			paid_date,
		} = req.body

		let parsedItems = typeof items === "string" ? JSON.parse(items) : items
		let parsedTaxes = typeof taxes === "string" ? JSON.parse(taxes) : taxes
		let totalAmount = 0

		parsedItems.forEach((item) => {
			totalAmount += (item.quantity || 0) * (item.price || 0)
		})

		parsedTaxes.forEach((tax) => {
			totalAmount += tax.amount || 0
		})

		await db.execute(
			`
      UPDATE invoices 
      SET recipient_name=?, recipient_phone=?, recipient_npwp=?, recipient_address=?, 
          items=?, taxes=?, status=?, paid_date=?, total_amount=?
      WHERE id=?
    `,
			[
				recipient_name,
				recipient_phone,
				recipient_npwp || null,
				recipient_address || null,
				JSON.stringify(parsedItems),
				JSON.stringify(parsedTaxes),
				status || "draft",
				paid_date || null,
				totalAmount,
				uuid,
			],
		)

		res.json({ success: true })
	} catch (error) {
		res.status(500).json({ success: false, error: error.message })
	}
}

// UPDATE STATUS INVOICE
exports.updateStatus = async (req, res) => {
	try {
		const { uuid } = req.params
		const { status, paid_date } = req.body

		await db.execute("UPDATE invoices SET status=?, paid_date=? WHERE id=?", [
			status,
			paid_date || null,
			uuid,
		])

		res.json({ success: true })
	} catch (error) {
		res.status(500).json({ success: false, error: error.message })
	}
}

// DELETE INVOICE
exports.deleteInvoice = async (req, res) => {
	try {
		const { uuid } = req.params
		await db.execute("DELETE FROM invoices WHERE id=?", [uuid])
		res.json({ success: true })
	} catch (error) {
		res.status(500).json({ success: false, error: error.message })
	}
}

// GENERATE SHARE LINK
exports.generateShareLink = async (req, res) => {
	try {
		const { uuid } = req.params
		const shareToken = crypto.randomBytes(32).toString("hex")

		// Set expiry ke 30 hari dari sekarang
		const expiresAt = new Date()
		expiresAt.setDate(expiresAt.getDate() + 30)

		// Cek apakah sudah ada share untuk invoice ini
		const [existing] = await db.execute(
			"SELECT id FROM invoice_shares WHERE invoice_id = ?",
			[uuid],
		)

		if (existing.length > 0) {
			// Update existing share
			await db.execute(
				`UPDATE invoice_shares 
				 SET share_token = ?, expires_at = ?, accessed_at = NULL, created_at = NOW() 
				 WHERE invoice_id = ?`,
				[shareToken, expiresAt, uuid],
			)
		} else {
			// Insert new share
			await db.execute(
				`INSERT INTO invoice_shares (invoice_id, share_token, expires_at, created_at) 
				 VALUES (?, ?, ?, NOW())`,
				[uuid, shareToken, expiresAt],
			)
		}

		const shareUrl = `${req.protocol}://${req.get(
			"host",
		)}/invoice/share/${shareToken}`
		res.json({ success: true, shareUrl, shareToken })
	} catch (error) {
		console.error("Generate share link error:", error)
		res.status(500).json({ success: false, error: error.message })
	}
}

// DOWNLOAD PDF
exports.downloadPDF = async (req, res) => {
	try {
		const { uuid, type } = req.params
		const [rows] = await db.execute(
			`
      SELECT i.*, 
             c.name AS company_name, 
             c.address AS company_address, 
             c.phone AS company_phone,
             c.logo_path,
             c.bank_account_name, 
             c.bank_account_number, 
             c.bank_name
      FROM invoices i 
      JOIN companies c ON i.company_id = c.id 
      WHERE i.id = ?
    `,
			[uuid],
		)

		if (!rows.length) {
			return res.status(404).send("Invoice tidak ditemukan")
		}

		const invoice = rows[0]
		try {
			invoice.items =
				typeof invoice.items === "string"
					? JSON.parse(invoice.items)
					: invoice.items || []
			invoice.taxes =
				typeof invoice.taxes === "string"
					? JSON.parse(invoice.taxes)
					: invoice.taxes || []
		} catch (err) {
			invoice.items = []
			invoice.taxes = []
		}

		const pdfBuffer = await generatePDF(invoice, type || "normal")
		res.setHeader("Content-Type", "application/pdf")
		res.setHeader(
			"Content-Disposition",
			`attachment; filename=invoice-${invoice.invoice_number}.pdf`,
		)
		res.send(pdfBuffer)
	} catch (error) {
		console.error("PDF error:", error)
		res.status(500).send("Terjadi kesalahan: " + error.message)
	}
}
