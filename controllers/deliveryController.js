const db = require("../db/connection")
const { v4: uuidv4 } = require("uuid")
const generateDeliveryNotePDF = require("../pdf_templates/deliveryNoteTemplate")

const PER_PAGE = 20

// Opsi urutan daftar surat jalan (whitelist agar aman dari SQL injection)
const DELIVERY_SORT_OPTIONS = {
	delivery_date_desc: "d.delivery_date DESC, d.created_at DESC",
	delivery_date_asc: "d.delivery_date ASC, d.created_at ASC",
	delivery_number_asc: "d.delivery_number ASC",
	delivery_number_desc: "d.delivery_number DESC",
	created_at_desc: "d.created_at DESC",
}
const DEFAULT_SORT = "delivery_date_desc"

function resolveSort(sortParam) {
	const sort = Object.prototype.hasOwnProperty.call(
		DELIVERY_SORT_OPTIONS,
		sortParam,
	)
		? sortParam
		: DEFAULT_SORT
	return { sort, orderBy: DELIVERY_SORT_OPTIONS[sort] }
}

// Bersihkan & normalisasi array item dari form (JSON string)
function parseItems(raw) {
	let arr = []
	try {
		arr = typeof raw === "string" ? JSON.parse(raw) : raw
	} catch (e) {
		arr = []
	}
	if (!Array.isArray(arr)) return []
	return arr
		.filter((it) => it && String(it.description || "").trim())
		.map((it) => ({
			description: String(it.description).trim(),
			quantity_out: parseInt(it.quantity_out, 10) || 0,
			quantity_in: parseInt(it.quantity_in, 10) || 0,
			condition_out: it.condition_out || null,
			condition_in: it.condition_in || null,
			notes: it.notes || null,
		}))
}

// Generate nomor surat jalan: SJ/<YYYYMM>/<NNN>
// Memakai nomor urut TERBESAR yang sudah ada (bukan COUNT) agar tidak
// bertabrakan setelah sebuah surat jalan dihapus.
async function generateDeliveryNumber() {
	const now = new Date()
	const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`
	const prefix = `SJ/${ym}/`
	const [rows] = await db.execute(
		`SELECT MAX(CAST(SUBSTRING(delivery_number, ?) AS UNSIGNED)) AS maxSeq
     FROM delivery_notes WHERE delivery_number LIKE ?`,
		[prefix.length + 1, `${prefix}%`],
	)
	const next = (Number(rows[0].maxSeq) || 0) + 1
	return `${prefix}${String(next).padStart(3, "0")}`
}

async function getActiveCustomers() {
	const [rows] = await db.execute(
		"SELECT id, name, company, phone, address FROM customers WHERE is_active = 1 ORDER BY name ASC",
	)
	return rows
}

// Booking terbaru untuk dropdown (beserta data klien untuk autofill)
async function getBookingOptions() {
	const [rows] = await db.query(
		`SELECT b.id, b.booking_number, b.title, b.customer_name, b.customer_phone,
            b.location, b.customer_id
     FROM bookings b
     ORDER BY b.event_start DESC
     LIMIT 200`,
	)
	return rows
}

// Daftar perusahaan penerbit surat jalan
async function getCompanies() {
	const [rows] = await db.execute(
		"SELECT id, name, address, phone, logo_path FROM companies ORDER BY id ASC",
	)
	return rows
}

// LIST SURAT JALAN
exports.getDeliveries = async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1
		const offset = (page - 1) * PER_PAGE

		const search = req.query.search || ""
		const status = req.query.status || ""
		const { sort, orderBy } = resolveSort(req.query.sort)

		let whereClause = "WHERE 1=1"
		const params = []

		if (search) {
			whereClause +=
				" AND (d.delivery_number LIKE ? OR d.recipient_name LIKE ? OR d.driver_name LIKE ?)"
			params.push(`%${search}%`, `%${search}%`, `%${search}%`)
		}
		if (status) {
			whereClause += " AND d.status = ?"
			params.push(status)
		}

		const [rows] = await db.query(
			`SELECT d.*, b.booking_number, b.title AS booking_title
       FROM delivery_notes d
       LEFT JOIN bookings b ON d.booking_id = b.id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
			[...params, PER_PAGE, offset],
		)

		const [countResult] = await db.execute(
			`SELECT COUNT(*) AS total FROM delivery_notes d ${whereClause}`,
			params,
		)
		const totalDeliveries = countResult[0].total
		const totalPages = Math.ceil(totalDeliveries / PER_PAGE)

		res.render("pages/admin/deliveries", {
			deliveries: rows,
			currentPage: page,
			totalPages,
			totalDeliveries,
			search,
			status,
			sort,
			success: req.query.success || null,
			error: req.query.error || null,
		})
	} catch (error) {
		console.error("Delivery list error:", error)
		res.status(500).send("Terjadi kesalahan: " + error.message)
	}
}

// FORM CREATE
exports.showCreateForm = async (req, res) => {
	try {
		const suggestedNumber = await generateDeliveryNumber()
		const customers = await getActiveCustomers()
		const bookings = await getBookingOptions()
		const companies = await getCompanies()

		res.render("pages/admin/delivery-form", {
			delivery: null,
			suggestedNumber,
			customers,
			bookings,
			companies,
			error: req.query.error || null,
		})
	} catch (error) {
		console.error("Delivery form error:", error)
		res.status(500).send("Terjadi kesalahan: " + error.message)
	}
}

// CREATE
exports.createDelivery = async (req, res) => {
	try {
		const id = uuidv4()
		const {
			delivery_number,
			company_id,
			booking_id,
			customer_id,
			recipient_name,
			recipient_phone,
			recipient_address,
			driver_name,
			vehicle_number,
			delivery_date,
			return_date,
			status = "draft",
			items,
			notes,
		} = req.body

		if (!recipient_name) {
			return res.redirect(
				"/admin/deliveries/create?error=" +
					encodeURIComponent("Nama penerima wajib diisi"),
			)
		}

		const number = delivery_number?.trim() || (await generateDeliveryNumber())
		const parsedItems = parseItems(items)

		await db.execute(
			`INSERT INTO delivery_notes
        (id, delivery_number, company_id, booking_id, customer_id, recipient_name, recipient_phone,
         recipient_address, driver_name, vehicle_number, delivery_date, return_date, items, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				number,
				company_id || null,
				booking_id || null,
				customer_id || null,
				recipient_name,
				recipient_phone || null,
				recipient_address || null,
				driver_name || null,
				vehicle_number || null,
				delivery_date || null,
				return_date || null,
				JSON.stringify(parsedItems),
				status,
				notes || null,
			],
		)

		res.redirect(
			"/admin/deliveries?success=" +
				encodeURIComponent("Surat jalan berhasil dibuat"),
		)
	} catch (error) {
		console.error("Create delivery error:", error)
		res.redirect("/admin/deliveries/create?error=" + encodeURIComponent(error.message))
	}
}

// FORM EDIT
exports.showEditForm = async (req, res) => {
	try {
		const { id } = req.params
		const [rows] = await db.execute(
			"SELECT * FROM delivery_notes WHERE id = ?",
			[id],
		)
		if (!rows.length) {
			return res.status(404).send("Surat jalan tidak ditemukan")
		}
		const delivery = rows[0]
		try {
			delivery.items =
				typeof delivery.items === "string"
					? JSON.parse(delivery.items)
					: delivery.items || []
		} catch (e) {
			delivery.items = []
		}

		const customers = await getActiveCustomers()
		const bookings = await getBookingOptions()
		const companies = await getCompanies()

		res.render("pages/admin/delivery-form", {
			delivery,
			suggestedNumber: delivery.delivery_number,
			customers,
			bookings,
			companies,
			error: req.query.error || null,
		})
	} catch (error) {
		console.error("Delivery edit form error:", error)
		res.status(500).send("Terjadi kesalahan: " + error.message)
	}
}

// UPDATE
exports.updateDelivery = async (req, res) => {
	try {
		const { id } = req.params
		const {
			delivery_number,
			company_id,
			booking_id,
			customer_id,
			recipient_name,
			recipient_phone,
			recipient_address,
			driver_name,
			vehicle_number,
			delivery_date,
			return_date,
			status,
			items,
			notes,
		} = req.body

		if (!recipient_name) {
			return res.redirect(
				`/admin/deliveries/${id}/edit?error=` +
					encodeURIComponent("Nama penerima wajib diisi"),
			)
		}

		const parsedItems = parseItems(items)

		await db.execute(
			`UPDATE delivery_notes
       SET delivery_number=?, company_id=?, booking_id=?, customer_id=?, recipient_name=?, recipient_phone=?,
           recipient_address=?, driver_name=?, vehicle_number=?, delivery_date=?, return_date=?,
           items=?, status=?, notes=?
       WHERE id=?`,
			[
				delivery_number,
				company_id || null,
				booking_id || null,
				customer_id || null,
				recipient_name,
				recipient_phone || null,
				recipient_address || null,
				driver_name || null,
				vehicle_number || null,
				delivery_date || null,
				return_date || null,
				JSON.stringify(parsedItems),
				status,
				notes || null,
				id,
			],
		)

		res.redirect(
			"/admin/deliveries?success=" +
				encodeURIComponent("Surat jalan berhasil diperbarui"),
		)
	} catch (error) {
		console.error("Update delivery error:", error)
		res.redirect(
			`/admin/deliveries/${req.params.id}/edit?error=` +
				encodeURIComponent(error.message),
		)
	}
}

// UBAH STATUS CEPAT
exports.updateDeliveryStatus = async (req, res) => {
	try {
		const { id } = req.params
		const { status } = req.body
		const allowed = ["draft", "delivered", "returned", "cancelled"]
		if (!allowed.includes(status)) {
			return res.redirect(
				"/admin/deliveries?error=" + encodeURIComponent("Status tidak valid"),
			)
		}
		await db.execute("UPDATE delivery_notes SET status=? WHERE id=?", [status, id])
		res.redirect(
			"/admin/deliveries?success=" + encodeURIComponent("Status surat jalan diubah"),
		)
	} catch (error) {
		console.error("Update delivery status error:", error)
		res.redirect("/admin/deliveries?error=" + encodeURIComponent(error.message))
	}
}

// DELETE
exports.deleteDelivery = async (req, res) => {
	try {
		const { id } = req.params
		await db.execute("DELETE FROM delivery_notes WHERE id = ?", [id])
		res.redirect(
			"/admin/deliveries?success=" +
				encodeURIComponent("Surat jalan berhasil dihapus"),
		)
	} catch (error) {
		console.error("Delete delivery error:", error)
		res.redirect("/admin/deliveries?error=" + encodeURIComponent(error.message))
	}
}

// CETAK / PDF SURAT JALAN
exports.downloadDeliveryPDF = async (req, res) => {
	try {
		const { id } = req.params
		const [rows] = await db.execute(
			`SELECT d.*, b.booking_number, b.title AS booking_title,
              c.name AS company_name, c.address AS company_address,
              c.phone AS company_phone, c.logo_path
       FROM delivery_notes d
       LEFT JOIN bookings b ON d.booking_id = b.id
       LEFT JOIN companies c ON d.company_id = c.id
       WHERE d.id = ?`,
			[id],
		)

		if (!rows.length) {
			return res.status(404).send("Surat jalan tidak ditemukan")
		}

		const delivery = rows[0]
		try {
			delivery.items =
				typeof delivery.items === "string"
					? JSON.parse(delivery.items)
					: delivery.items || []
		} catch (e) {
			delivery.items = []
		}

		// Fallback: pakai perusahaan pertama bila surat jalan belum menautkan perusahaan
		if (!delivery.company_name) {
			const [comp] = await db.execute(
				"SELECT name, address, phone, logo_path FROM companies ORDER BY id ASC LIMIT 1",
			)
			if (comp.length) {
				delivery.company_name = comp[0].name
				delivery.company_address = comp[0].address
				delivery.company_phone = comp[0].phone
				delivery.logo_path = comp[0].logo_path
			}
		}

		const pdfBuffer = await generateDeliveryNotePDF(delivery)

		res.setHeader("Content-Type", "application/pdf")
		res.setHeader(
			"Content-Disposition",
			`inline; filename=surat-jalan-${delivery.delivery_number}.pdf`,
		)
		res.send(pdfBuffer)
	} catch (error) {
		console.error("Delivery PDF error:", error)
		res.status(500).send("Terjadi kesalahan: " + error.message)
	}
}
