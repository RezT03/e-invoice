const db = require("../db/connection")
const generatePDF = require("../utils/pdfGenerator")

// HALAMAN CEK INVOICE (user check invoice form)
exports.showCheckInvoice = (req, res) => {
	res.render("pages/user/check-invoice", { error: null, success: null })
}

// CHECK INVOICE DENGAN NOMOR INVOICE
exports.checkInvoice = async (req, res) => {
	try {
		const { invoice_number, recipient_phone } = req.body

		// Cari invoice dengan nomor dan nomor telepon penerima
		const [invoices] = await db.execute(
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
      WHERE i.invoice_number = ? AND i.recipient_phone = ?
    `,
			[invoice_number, recipient_phone],
		)

		if (invoices.length === 0) {
			return res.render("pages/user/check-invoice", {
				error: "Invoice tidak ditemukan atau nomor telepon tidak sesuai",
				success: null,
			})
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

		// Log akses
		await db.execute(
			"UPDATE invoice_shares SET accessed_at = NOW() WHERE invoice_id = ?",
			[invoice.id],
		)

		res.render("pages/user/invoice-view", {
			invoice,
			isAdmin: false,
			verified: true,
			shareToken: null,
		})
	} catch (error) {
		console.error("Check invoice error:", error)
		res.render("pages/user/check-invoice", {
			error: "Terjadi kesalahan saat mengecek invoice",
			success: null,
		})
	}
}

// LIHAT INVOICE MELALUI SHARED LINK
exports.viewSharedInvoice = async (req, res) => {
	try {
		const { shareToken } = req.params

		// Cari invoice dengan share token
		const [shares] = await db.execute(
			`
      SELECT s.*, i.*, 
             c.name AS company_name, 
             c.address AS company_address, 
             c.phone AS company_phone,
             c.logo_path,
             c.bank_account_name, 
             c.bank_account_number, 
             c.bank_name
      FROM invoice_shares s
      JOIN invoices i ON s.invoice_id = i.id
      JOIN companies c ON i.company_id = c.id
      WHERE s.share_token = ? AND (s.expires_at IS NULL OR s.expires_at > NOW())
    `,
			[shareToken],
		)

		if (shares.length === 0) {
			return res.status(404).render("pages/error", {
				message: "Shared link tidak valid atau telah kadaluarsa",
			})
		}

		const invoice = shares[0]
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

		// Update waktu akses
		await db.execute(
			"UPDATE invoice_shares SET accessed_at = NOW() WHERE share_token = ?",
			[shareToken],
		)

		res.render("pages/user/invoice-view", {
			invoice,
			isAdmin: false,
			verified: true,
			shareToken,
		})
	} catch (error) {
		console.error("View shared invoice error:", error)
		res.status(500).send("Terjadi kesalahan: " + error.message)
	}
}

// DOWNLOAD PDF INVOICE (PUBLIC)
exports.downloadPDF = async (req, res) => {
	try {
		const { shareToken } = req.params
		const templateType = req.query.template || req.params.type || "normal"

		// Validasi share token
		const [shares] = await db.execute(
			`
      SELECT i.*, c.name AS company_name, c.address AS company_address, c.phone AS company_phone,
             c.logo_path, c.bank_account_name, c.bank_account_number, c.bank_name
      FROM invoice_shares s
      JOIN invoices i ON s.invoice_id = i.id
      JOIN companies c ON i.company_id = c.id
      WHERE s.share_token = ? AND (s.expires_at IS NULL OR s.expires_at > NOW())
    `,
			[shareToken],
		)

		if (shares.length === 0) {
			return res
				.status(404)
				.send("Invoice tidak ditemukan atau link sudah kadaluarsa")
		}

		const invoice = shares[0]
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

		const pdfBuffer = await generatePDF(invoice, templateType)
		res.setHeader("Content-Type", "application/pdf")
		res.setHeader(
			"Content-Disposition",
			`attachment; filename=invoice-${invoice.invoice_number}.pdf`,
		)
		res.send(pdfBuffer)
	} catch (error) {
		console.error("PDF download error:", error)
		res.status(500).send("Terjadi kesalahan saat mengunduh PDF")
	}
}

// DOWNLOAD PDF INVOICE DARI CHECK INVOICE (tanpa share token)
exports.downloadPDFFromCheck = async (req, res) => {
	try {
		const { invoice_number, recipient_phone, template } = req.body
		const templateType = template || "normal"

		// Validasi invoice dengan nomor dan nomor telepon
		const [invoices] = await db.execute(
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
      WHERE i.invoice_number = ? AND i.recipient_phone = ?
    `,
			[invoice_number, recipient_phone],
		)

		if (invoices.length === 0) {
			return res.status(404).send("Invoice tidak ditemukan")
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

		const pdfBuffer = await generatePDF(invoice, templateType)
		res.setHeader("Content-Type", "application/pdf")
		res.setHeader(
			"Content-Disposition",
			`attachment; filename=invoice-${invoice.invoice_number}.pdf`,
		)
		res.send(pdfBuffer)
	} catch (error) {
		console.error("PDF download from check error:", error)
		res.status(500).send("Terjadi kesalahan saat mengunduh PDF")
	}
}
