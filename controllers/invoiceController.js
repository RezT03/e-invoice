const db = require("../db/connection")
const { v4: uuidv4 } = require("uuid")
const generatePDF = require("../utils/pdfGenerator")

exports.createInvoice = async (req, res) => {
	const id = uuidv4()
	const {
		invoice_number,
		recipient_name,
		recipient_phone,
		recipient_npwp,
		recipient_address,
		invoice_date,
		company_id,
		items,
		taxes,
		status,
		paid_date,
	} = req.body

	await db.execute(
		`INSERT INTO invoices
    (id, invoice_number, recipient_name, recipient_phone, recipient_npwp, recipient_address,
     invoice_date, company_id, items, taxes, status, paid_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			id,
			invoice_number,
			recipient_name,
			recipient_phone,
			recipient_npwp,
			recipient_address,
			invoice_date,
			company_id,
			JSON.stringify(items),
			JSON.stringify(taxes),
			status,
			paid_date || null, // <-- tambahkan ini
		],
	)

	res.json({ success: true, id })
}

exports.viewInvoice = async (req, res) => {
	const { uuid } = req.params
	const [invoices] = await db.execute(
		`SELECT i.*, c.name AS company_name, c.address AS company_address, c.phone AS company_phone,
            c.bank_account_name, c.bank_account_number, c.bank_name
     FROM invoices i JOIN companies c ON i.company_id = c.id WHERE i.id = ?`,
		[uuid],
	)

	if (invoices.length === 0) return res.status(404).send("Not found")
	const invoice = invoices[0]

	try {
		invoice.items =
			typeof invoice.items === "string"
				? JSON.parse(invoice.items)
				: invoice.items
	} catch (err) {
		invoice.items = []
	}
	try {
		invoice.taxes =
			typeof invoice.taxes === "string"
				? JSON.parse(invoice.taxes)
				: invoice.taxes || []
	} catch (err) {
		invoice.taxes = []
	}

	const isAdmin = req.session.admin || false
	res.render("pages/invoice-detail", { invoice, isAdmin })
}

exports.getInvoiceHistory = async (req, res) => {
	const [rows] = await db.execute(
		`SELECT i.id, invoice_number, recipient_name, invoice_date, status, c.name AS company_name
     FROM invoices i JOIN companies c ON i.company_id = c.id ORDER BY i.created_at DESC`,
	)
	const isAdmin = req.session.admin
	res.render("pages/invoice-history", { invoices: rows, isAdmin })
}

exports.updateInvoice = async (req, res) => {
	const { uuid } = req.params
	const {
		recipient_name,
		recipient_phone,
		recipient_npwp,
		recipient_address,
		items,
		taxes,
		paid_date, // <-- tambahkan ini jika ingin bisa update
	} = req.body
	await db.execute(
		`UPDATE invoices SET recipient_name=?, recipient_phone=?, recipient_npwp=?, recipient_address=?, items=?, taxes=?, paid_date=? WHERE id=?`,
		[
			recipient_name,
			recipient_phone,
			recipient_npwp,
			recipient_address,
			JSON.stringify(items),
			JSON.stringify(taxes),
			paid_date || null, // <-- tambahkan ini
			uuid,
		],
	)
	res.json({ success: true })
}

exports.updateStatus = async (req, res) => {
	const { uuid } = req.params
	const { status } = req.body
	await db.execute(`UPDATE invoices SET status=? WHERE id=?`, [status, uuid])
	res.json({ success: true })
}

exports.deleteInvoice = async (req, res) => {
	const { uuid } = req.params
	await db.execute("DELETE FROM invoices WHERE id=?", [uuid])
	res.json({ success: true })
}

exports.downloadPDF = async (req, res) => {
	const { uuid, type } = req.params
	const [rows] = await db.execute(
		`SELECT i.*, c.name AS company_name, c.address AS company_address, c.phone AS company_phone,
            c.bank_account_name, c.bank_account_number, c.bank_name
     FROM invoices i JOIN companies c ON i.company_id = c.id WHERE i.id = ?`,
		[uuid],
	)

	if (!rows.length) return res.status(404).send("Invoice not found")

	const invoice = rows[0]
	try {
		invoice.items =
			typeof invoice.items === "string"
				? JSON.parse(invoice.items)
				: invoice.items
	} catch (err) {
		invoice.items = []
	}
	try {
		invoice.taxes =
			typeof invoice.taxes === "string"
				? JSON.parse(invoice.taxes)
				: invoice.taxes || []
	} catch (err) {
		invoice.taxes = []
	}

	const pdfBuffer = await generatePDF(invoice, type)
	res.setHeader("Content-Type", "application/pdf")
	res.setHeader(
		"Content-Disposition",
		`inline; filename=invoice-${invoice.invoice_number}.pdf`,
	)
	res.send(pdfBuffer)
}

exports.showCreateForm = async (req, res) => {
	const [companies] = await db.execute("SELECT id, name FROM companies")
	const isAdmin = req.session.admin || false
	res.render("pages/invoice-create", { companies, isAdmin })
}
