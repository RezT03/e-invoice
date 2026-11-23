const db = require("../db/connection")
const { v4: uuidv4 } = require("uuid")
const fs = require("fs")
const path = require("path")
const { UPLOAD_DIR, MIME_BY_EXT } = require("../utils/paymentUpload")

const PER_PAGE = 20

// Hapus file bukti bayar dari disk (best-effort, tidak pernah melempar error)
function removeProofFile(proofPath) {
	if (!proofPath) return
	try {
		const file = path.join(UPLOAD_DIR, path.basename(proofPath))
		if (fs.existsSync(file)) fs.unlinkSync(file)
	} catch (e) {
		console.error("Gagal menghapus bukti bayar:", e.message)
	}
}

// Ambil ringkasan & daftar pembayaran untuk sebuah invoice (dipakai halaman invoice)
async function getInvoicePayments(invoiceId) {
	const [rows] = await db.query(
		`SELECT id, payment_number, payment_date, amount, method, reference, notes,
            proof_path, proof_original_name, created_at
     FROM payments
     WHERE invoice_id = ?
     ORDER BY payment_date ASC, created_at ASC`,
		[invoiceId],
	)
	const list = rows.map((r) => ({ ...r, amount: Number(r.amount) || 0 }))
	const totalPaid = list.reduce((sum, r) => sum + r.amount, 0)
	return { payments: list, totalPaid }
}

// Tandai invoice otomatis LUNAS saat akumulasi termin mencapai 100%.
// Dipanggil setelah pembayaran dibuat/diubah/dihapus. Invoice yang dibatalkan
// tidak diubah, dan paid_date yang sudah ada tidak ditimpa.
async function syncInvoicePaymentStatus(invoiceId, paymentDate) {
	if (!invoiceId) return { changed: false }

	try {
		const [invoiceRows] = await db.execute(
			`SELECT id, total_amount, status, paid_date, document_type
			 FROM invoices WHERE id = ?`,
			[invoiceId],
		)
		const invoice = invoiceRows[0]
		if (
			!invoice ||
			invoice.document_type !== "invoice" ||
			invoice.status === "cancelled"
		) {
			return { changed: false }
		}

		const totalCent = Math.round((Number(invoice.total_amount) || 0) * 100)
		if (totalCent <= 0) return { changed: false }

		const [sumRows] = await db.execute(
			"SELECT COALESCE(SUM(amount), 0) AS paid FROM payments WHERE invoice_id = ?",
			[invoiceId],
		)
		const paidCent = Math.round((Number(sumRows[0].paid) || 0) * 100)
		if (paidCent < totalCent) return { changed: false }

		const date = paymentDate || null
		if (invoice.status !== "paid") {
			await db.execute(
				"UPDATE invoices SET status = 'paid', paid_date = COALESCE(?, CURDATE()) WHERE id = ?",
				[date, invoiceId],
			)
			return { changed: true }
		}

		if (!invoice.paid_date) {
			await db.execute(
				"UPDATE invoices SET paid_date = COALESCE(?, CURDATE()) WHERE id = ?",
				[date, invoiceId],
			)
		}
		return { changed: false }
	} catch (error) {
		console.error("Sync invoice payment status error:", error)
		return { changed: false, error: error.message }
	}
}

// Tujuan redirect setelah simpan: hormati redirect_to bila berupa path internal
// (mis. kembali ke halaman detail invoice). Cegah open redirect.
function resolveRedirect(req, fallback) {
	const target = req.body && req.body.redirect_to
	if (
		typeof target === "string" &&
		target.startsWith("/admin/") &&
		!target.startsWith("//")
	) {
		return target
	}
	return fallback
}

// Tambahkan query string pesan (success/error) ke sebuah URL internal
function appendMessage(url, key, message) {
	const sep = url.includes("?") ? "&" : "?"
	return url + sep + key + "=" + encodeURIComponent(message)
}

// Catatan: tabel `payments` dan `invoices` bisa punya collation berbeda
// (mis. invoices dibuat dengan utf8mb4_general_ci sementara tabel baru memakai
// default utf8mb4_0900_ai_ci). Semua JOIN di sini memaksa collation agar aman.
const JOIN_COLLATE = "utf8mb4_general_ci"

// Opsi urutan daftar pembayaran (whitelist agar aman dari SQL injection)
const PAYMENT_SORT_OPTIONS = {
	payment_date_desc: "p.payment_date DESC, p.created_at DESC",
	payment_date_asc: "p.payment_date ASC, p.created_at ASC",
	amount_desc: "p.amount DESC",
	amount_asc: "p.amount ASC",
	created_at_desc: "p.created_at DESC",
}
const DEFAULT_SORT = "payment_date_desc"

function resolveSort(sortParam) {
	const sort = Object.prototype.hasOwnProperty.call(
		PAYMENT_SORT_OPTIONS,
		sortParam,
	)
		? sortParam
		: DEFAULT_SORT
	return { sort, orderBy: PAYMENT_SORT_OPTIONS[sort] }
}

// Generate nomor pembayaran: PAY/<YYYYMM>/<NNN>
// Memakai nomor urut TERBESAR yang sudah ada (bukan COUNT) agar tidak
// bertabrakan setelah sebuah pembayaran dihapus.
async function generatePaymentNumber() {
	const now = new Date()
	const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`
	const prefix = `PAY/${ym}/`
	const [rows] = await db.execute(
		`SELECT MAX(CAST(SUBSTRING(payment_number, ?) AS UNSIGNED)) AS maxSeq
     FROM payments WHERE payment_number LIKE ?`,
		[prefix.length + 1, `${prefix}%`],
	)
	const next = (Number(rows[0].maxSeq) || 0) + 1
	return `${prefix}${String(next).padStart(3, "0")}`
}

async function getActiveCustomers() {
	const [rows] = await db.execute(
		"SELECT id, name, company, phone FROM customers WHERE is_active = 1 ORDER BY name ASC",
	)
	return rows
}

// Invoice terbaru untuk dropdown, lengkap dengan total dibayar & sisa
async function getInvoiceOptions() {
	const [rows] = await db.query(
		`SELECT i.id, i.invoice_number, i.recipient_name, i.total_amount, i.customer_id,
            i.document_type, i.status, COALESCE(SUM(p.amount), 0) AS paid
     FROM invoices i
     LEFT JOIN payments p ON p.invoice_id COLLATE ${JOIN_COLLATE} = i.id
     GROUP BY i.id
     ORDER BY i.invoice_date DESC, i.created_at DESC
     LIMIT 200`,
	)
	return rows.map((r) => {
		const total = Number(r.total_amount) || 0
		const paid = Number(r.paid) || 0
		return {
			...r,
			total_amount: total,
			paid,
			remaining: r.status === "paid" ? 0 : Math.max(0, total - paid),
		}
	})
}

// LIST PEMBAYARAN
exports.getPayments = async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1
		const offset = (page - 1) * PER_PAGE

		const search = req.query.search || ""
		const method = req.query.method || ""
		const { sort, orderBy } = resolveSort(req.query.sort)

		let whereClause = "WHERE 1=1"
		const params = []

		if (search) {
			whereClause +=
				" AND (p.payment_number LIKE ? OR p.reference LIKE ? OR i.invoice_number LIKE ? OR i.recipient_name LIKE ?)"
			params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
		}
		if (method) {
			whereClause += " AND p.method = ?"
			params.push(method)
		}

		const [rows] = await db.query(
			`SELECT p.*, i.invoice_number, i.recipient_name, i.total_amount
       FROM payments p
       LEFT JOIN invoices i ON p.invoice_id COLLATE ${JOIN_COLLATE} = i.id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
			[...params, PER_PAGE, offset],
		)

		const [countResult] = await db.execute(
			`SELECT COUNT(*) AS total FROM payments p
       LEFT JOIN invoices i ON p.invoice_id COLLATE ${JOIN_COLLATE} = i.id
       ${whereClause}`,
			params,
		)
		const totalPayments = countResult[0].total
		const totalPages = Math.ceil(totalPayments / PER_PAGE)

		// Ringkasan total nilai pembayaran sesuai filter
		const [sumResult] = await db.execute(
			`SELECT COALESCE(SUM(p.amount), 0) AS total_amount FROM payments p
       LEFT JOIN invoices i ON p.invoice_id COLLATE ${JOIN_COLLATE} = i.id
       ${whereClause}`,
			params,
		)

		res.render("pages/admin/payments", {
			payments: rows,
			currentPage: page,
			totalPages,
			totalPayments,
			totalAmount: Number(sumResult[0].total_amount) || 0,
			search,
			method,
			sort,
			success: req.query.success || null,
			error: req.query.error || null,
		})
	} catch (error) {
		console.error("Payment list error:", error)
		res.status(500).send("Terjadi kesalahan: " + error.message)
	}
}

// FORM CREATE
exports.showCreateForm = async (req, res) => {
	try {
		const suggestedNumber = await generatePaymentNumber()
		const customers = await getActiveCustomers()
		const invoices = await getInvoiceOptions()

		res.render("pages/admin/payment-form", {
			payment: null,
			suggestedNumber,
			customers,
			invoices,
			presetInvoiceId: req.query.invoice_id || null,
			redirectTo: req.query.redirect_to || null,
			error: req.query.error || null,
		})
	} catch (error) {
		console.error("Payment form error:", error)
		res.status(500).send("Terjadi kesalahan: " + error.message)
	}
}

// CREATE
exports.createPayment = async (req, res) => {
	try {
		const id = uuidv4()
		const {
			payment_number,
			invoice_id,
			customer_id,
			payment_date,
			amount,
			method = "transfer",
			reference,
			notes,
		} = req.body

		if (!payment_date || !amount) {
			return res.redirect(
				"/admin/payments/create?error=" +
					encodeURIComponent("Tanggal dan jumlah pembayaran wajib diisi"),
			)
		}

		const number = payment_number?.trim() || (await generatePaymentNumber())

		// Bukti bayar (opsional)
		const proofPath = req.file ? req.file.filename : null
		const proofOriginal = req.file ? req.file.originalname : null
		const proofMime = req.file ? req.file.mimetype : null

		await db.execute(
			`INSERT INTO payments
        (id, payment_number, invoice_id, customer_id, payment_date, amount, method, reference, notes,
         proof_path, proof_original_name, proof_mime)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				number,
				invoice_id || null,
				customer_id || null,
				payment_date,
				Number(amount) || 0,
				method,
				reference || null,
				notes || null,
				proofPath,
				proofOriginal,
				proofMime,
			],
		)

		await syncInvoicePaymentStatus(invoice_id, payment_date)

		res.redirect(
			appendMessage(
				resolveRedirect(req, "/admin/payments"),
				"success",
				"Pembayaran berhasil dicatat",
			),
		)
	} catch (error) {
		console.error("Create payment error:", error)
		res.redirect("/admin/payments/create?error=" + encodeURIComponent(error.message))
	}
}

// FORM EDIT
exports.showEditForm = async (req, res) => {
	try {
		const { id } = req.params
		const [rows] = await db.execute("SELECT * FROM payments WHERE id = ?", [id])
		if (!rows.length) {
			return res.status(404).send("Pembayaran tidak ditemukan")
		}
		const payment = rows[0]

		const customers = await getActiveCustomers()
		const invoices = await getInvoiceOptions()

		res.render("pages/admin/payment-form", {
			payment,
			suggestedNumber: payment.payment_number,
			customers,
			invoices,
			presetInvoiceId: payment.invoice_id || null,
			redirectTo: req.query.redirect_to || null,
			error: req.query.error || null,
		})
	} catch (error) {
		console.error("Payment edit form error:", error)
		res.status(500).send("Terjadi kesalahan: " + error.message)
	}
}

// UPDATE
exports.updatePayment = async (req, res) => {
	try {
		const { id } = req.params
		const {
			payment_number,
			invoice_id,
			customer_id,
			payment_date,
			amount,
			method,
			reference,
			notes,
		} = req.body

		if (!payment_date || !amount) {
			return res.redirect(
				`/admin/payments/${id}/edit?error=` +
					encodeURIComponent("Tanggal dan jumlah pembayaran wajib diisi"),
			)
		}

		// Ambil bukti bayar lama untuk keperluan ganti / hapus
		const [existingRows] = await db.execute(
			"SELECT proof_path, proof_original_name, proof_mime FROM payments WHERE id = ?",
			[id],
		)
		const existing = existingRows[0] || {}
		let proofPath = existing.proof_path || null
		let proofOriginal = existing.proof_original_name || null
		let proofMime = existing.proof_mime || null

		// Hapus bukti bila dicentang
		if (req.body.remove_proof) {
			removeProofFile(proofPath)
			proofPath = null
			proofOriginal = null
			proofMime = null
		}

		// Ganti bukti bila ada file baru
		if (req.file) {
			if (existing.proof_path) removeProofFile(existing.proof_path)
			proofPath = req.file.filename
			proofOriginal = req.file.originalname
			proofMime = req.file.mimetype
		}

		await db.execute(
			`UPDATE payments
       SET payment_number=?, invoice_id=?, customer_id=?, payment_date=?, amount=?,
           method=?, reference=?, notes=?,
           proof_path=?, proof_original_name=?, proof_mime=?
       WHERE id=?`,
			[
				payment_number,
				invoice_id || null,
				customer_id || null,
				payment_date,
				Number(amount) || 0,
				method || "transfer",
				reference || null,
				notes || null,
				proofPath,
				proofOriginal,
				proofMime,
				id,
			],
		)

		await syncInvoicePaymentStatus(invoice_id, payment_date)

		res.redirect(
			"/admin/payments?success=" + encodeURIComponent("Pembayaran berhasil diperbarui"),
		)
	} catch (error) {
		console.error("Update payment error:", error)
		res.redirect(
			`/admin/payments/${req.params.id}/edit?error=` + encodeURIComponent(error.message),
		)
	}
}

// DELETE
exports.deletePayment = async (req, res) => {
	try {
		const { id } = req.params
		const [rows] = await db.execute(
			"SELECT proof_path, invoice_id FROM payments WHERE id = ?",
			[id],
		)
		if (rows.length && rows[0].proof_path) removeProofFile(rows[0].proof_path)
		await db.execute("DELETE FROM payments WHERE id = ?", [id])
		await syncInvoicePaymentStatus(rows[0] && rows[0].invoice_id)
		res.redirect(
			"/admin/payments?success=" + encodeURIComponent("Pembayaran berhasil dihapus"),
		)
	} catch (error) {
		console.error("Delete payment error:", error)
		res.redirect("/admin/payments?error=" + encodeURIComponent(error.message))
	}
}

// SAJIKAN BUKTI BAYAR (preview / unduh)
exports.serveProof = async (req, res) => {
	try {
		const { id } = req.params
		const [rows] = await db.execute(
			"SELECT proof_path, proof_original_name, proof_mime FROM payments WHERE id = ?",
			[id],
		)

		if (!rows.length || !rows[0].proof_path) {
			return res.status(404).send("Bukti bayar tidak ditemukan")
		}

		const payment = rows[0]
		// path.basename mencegah path traversal
		const filePath = path.join(UPLOAD_DIR, path.basename(payment.proof_path))
		if (!fs.existsSync(filePath)) {
			return res.status(404).send("File bukti bayar tidak ditemukan di server")
		}

		const ext = path.extname(filePath).toLowerCase()
		const mime = MIME_BY_EXT[ext] || payment.proof_mime || "application/octet-stream"
		const filename = payment.proof_original_name || path.basename(filePath)

		res.setHeader("Content-Type", mime)
		res.setHeader(
			"Content-Disposition",
			`inline; filename="${encodeURIComponent(filename)}"`,
		)
		fs.createReadStream(filePath).pipe(res)
	} catch (error) {
		console.error("Serve proof error:", error)
		res.status(500).send("Terjadi kesalahan: " + error.message)
	}
}

// Ekspor helper untuk dipakai controller lain (mis. halaman detail invoice)
exports.getInvoicePayments = getInvoicePayments
exports.syncInvoicePaymentStatus = syncInvoicePaymentStatus
