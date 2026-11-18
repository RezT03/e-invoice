const db = require("../db/connection")
const { v4: uuidv4 } = require("uuid")
const googleCalendar = require("../utils/googleCalendar")

const PER_PAGE = 20

// Opsi urutan daftar booking (whitelist agar aman dari SQL injection)
const BOOKING_SORT_OPTIONS = {
	event_start_desc: "b.event_start DESC",
	event_start_asc: "b.event_start ASC",
	created_at_desc: "b.created_at DESC",
	created_at_asc: "b.created_at ASC",
}
const DEFAULT_SORT = "event_start_desc"

function resolveSort(sortParam) {
	const sort = Object.prototype.hasOwnProperty.call(
		BOOKING_SORT_OPTIONS,
		sortParam,
	)
		? sortParam
		: DEFAULT_SORT
	return { sort, orderBy: BOOKING_SORT_OPTIONS[sort] }
}

// Terima "2026-11-18T09:00" dari input datetime-local -> "2026-11-18 09:00:00"
function toMysqlDateTime(value) {
	if (!value) return null
	return String(value).replace("T", " ").trim()
}

// Date/string -> "YYYY-MM-DDTHH:mm" untuk value input datetime-local
function toInputDateTime(value) {
	if (!value) return ""
	const d = value instanceof Date ? value : new Date(value)
	if (isNaN(d.getTime())) return ""
	const pad = (n) => String(n).padStart(2, "0")
	return (
		`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
		`T${pad(d.getHours())}:${pad(d.getMinutes())}`
	)
}

// Ambil pelanggan aktif untuk dropdown integrasi Master Pelanggan
async function getActiveCustomers() {
	const [rows] = await db.execute(
		"SELECT id, name, company, phone, email FROM customers WHERE is_active = 1 ORDER BY name ASC",
	)
	return rows
}

// Generate nomor booking: BK/<YYYYMM>/<NNN>
// Memakai nomor urut TERBESAR yang sudah ada (bukan COUNT) agar tidak
// bertabrakan setelah sebuah booking dihapus.
async function generateBookingNumber() {
	const now = new Date()
	const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`
	const prefix = `BK/${ym}/`
	const [rows] = await db.execute(
		`SELECT MAX(CAST(SUBSTRING(booking_number, ?) AS UNSIGNED)) AS maxSeq
     FROM bookings WHERE booking_number LIKE ?`,
		[prefix.length + 1, `${prefix}%`],
	)
	const next = (Number(rows[0].maxSeq) || 0) + 1
	return `${prefix}${String(next).padStart(3, "0")}`
}

// Sinkronisasi satu booking ke Google Calendar (best-effort, tidak pernah throw).
async function syncBookingToCalendar(bookingId) {
	try {
		const [rows] = await db.execute("SELECT * FROM bookings WHERE id = ?", [
			bookingId,
		])
		if (!rows.length) return

		const booking = rows[0]

		if (!googleCalendar.isConfigured()) {
			await db.execute(
				`UPDATE bookings SET sync_status='skipped', sync_error=?, synced_at=NOW() WHERE id=?`,
				["Google Calendar belum dikonfigurasi", bookingId],
			)
			return
		}

		const result = booking.google_event_id
			? await googleCalendar.updateEvent(booking)
			: await googleCalendar.createEvent(booking)

		if (result.ok) {
			await db.execute(
				`UPDATE bookings
         SET google_event_id=?, google_calendar_id=?, sync_status='synced', sync_error=NULL, synced_at=NOW()
         WHERE id=?`,
				[
					result.eventId || booking.google_event_id,
					process.env.GOOGLE_CALENDAR_ID || null,
					bookingId,
				],
			)
		} else {
			await db.execute(
				`UPDATE bookings SET sync_status='failed', sync_error=? WHERE id=?`,
				[String(result.error || "Gagal sinkronisasi").slice(0, 500), bookingId],
			)
		}
	} catch (error) {
		console.error("Calendar sync error:", error)
		try {
			await db.execute(
				`UPDATE bookings SET sync_status='failed', sync_error=? WHERE id=?`,
				[String(error.message).slice(0, 500), bookingId],
			)
		} catch (_) {
			/* abaikan */
		}
	}
}

// LIST BOOKING
exports.getBookings = async (req, res) => {
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
				" AND (b.booking_number LIKE ? OR b.title LIKE ? OR b.customer_name LIKE ?)"
			params.push(`%${search}%`, `%${search}%`, `%${search}%`)
		}
		if (status) {
			whereClause += " AND b.status = ?"
			params.push(status)
		}

		const [rows] = await db.query(
			`SELECT b.*
       FROM bookings b
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
			[...params, PER_PAGE, offset],
		)

		const [countResult] = await db.execute(
			`SELECT COUNT(*) AS total FROM bookings b ${whereClause}`,
			params,
		)
		const totalBookings = countResult[0].total
		const totalPages = Math.ceil(totalBookings / PER_PAGE)

		res.render("pages/admin/bookings", {
			bookings: rows,
			currentPage: page,
			totalPages,
			totalBookings,
			search,
			status,
			sort,
			calendarConfigured: googleCalendar.isConfigured(),
			success: req.query.success || null,
			error: req.query.error || null,
		})
	} catch (error) {
		console.error("Booking list error:", error)
		res.status(500).send("Terjadi kesalahan: " + error.message)
	}
}

// FORM CREATE
exports.showCreateForm = async (req, res) => {
	try {
		const suggestedNumber = await generateBookingNumber()
		const customers = await getActiveCustomers()
		res.render("pages/admin/booking-form", {
			booking: null,
			suggestedNumber,
			customers,
			calendarConfigured: googleCalendar.isConfigured(),
			error: req.query.error || null,
		})
	} catch (error) {
		console.error("Booking form error:", error)
		res.status(500).send("Terjadi kesalahan: " + error.message)
	}
}

// CREATE
exports.createBooking = async (req, res) => {
	try {
		const id = uuidv4()
		const {
			booking_number,
			customer_id,
			title,
			customer_name,
			customer_phone,
			customer_email,
			location,
			event_start,
			event_end,
			crew_name,
			status = "draft",
			notes,
		} = req.body

		if (!title || !customer_name || !event_start || !event_end) {
			return res.redirect(
				"/admin/bookings/create?error=" +
					encodeURIComponent("Judul, klien, dan jadwal wajib diisi"),
			)
		}

		const number = booking_number?.trim() || (await generateBookingNumber())

		await db.execute(
			`INSERT INTO bookings
        (id, booking_number, customer_id, title, customer_name, customer_phone, customer_email,
         location, event_start, event_end, crew_name, status, notes, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
			[
				id,
				number,
				customer_id || null,
				title,
				customer_name,
				customer_phone || null,
				customer_email || null,
				location || null,
				toMysqlDateTime(event_start),
				toMysqlDateTime(event_end),
				crew_name || null,
				status,
				notes || null,
			],
		)

		// Sinkronisasi kalender (best-effort) - tidak memblokir jika gagal
		await syncBookingToCalendar(id)

		res.redirect("/admin/bookings?success=" + encodeURIComponent("Booking berhasil dibuat"))
	} catch (error) {
		console.error("Create booking error:", error)
		res.redirect(
			"/admin/bookings/create?error=" + encodeURIComponent(error.message),
		)
	}
}

// FORM EDIT
exports.showEditForm = async (req, res) => {
	try {
		const { id } = req.params
		const [rows] = await db.execute("SELECT * FROM bookings WHERE id = ?", [id])
		if (!rows.length) {
			return res.status(404).send("Booking tidak ditemukan")
		}
		const booking = rows[0]
		booking.event_start_input = toInputDateTime(booking.event_start)
		booking.event_end_input = toInputDateTime(booking.event_end)

		const customers = await getActiveCustomers()
		res.render("pages/admin/booking-form", {
			booking,
			suggestedNumber: booking.booking_number,
			customers,
			calendarConfigured: googleCalendar.isConfigured(),
			error: req.query.error || null,
		})
	} catch (error) {
		console.error("Booking edit form error:", error)
		res.status(500).send("Terjadi kesalahan: " + error.message)
	}
}

// UPDATE
exports.updateBooking = async (req, res) => {
	try {
		const { id } = req.params
		const {
			booking_number,
			customer_id,
			title,
			customer_name,
			customer_phone,
			customer_email,
			location,
			event_start,
			event_end,
			crew_name,
			status,
			notes,
		} = req.body

		await db.execute(
			`UPDATE bookings
       SET booking_number=?, customer_id=?, title=?, customer_name=?, customer_phone=?, customer_email=?,
           location=?, event_start=?, event_end=?, crew_name=?, status=?, notes=?
       WHERE id=?`,
			[
				booking_number,
				customer_id || null,
				title,
				customer_name,
				customer_phone || null,
				customer_email || null,
				location || null,
				toMysqlDateTime(event_start),
				toMysqlDateTime(event_end),
				crew_name || null,
				status,
				notes || null,
				id,
			],
		)

		await syncBookingToCalendar(id)

		res.redirect("/admin/bookings?success=" + encodeURIComponent("Booking berhasil diperbarui"))
	} catch (error) {
		console.error("Update booking error:", error)
		res.redirect(
			`/admin/bookings/${req.params.id}/edit?error=` +
				encodeURIComponent(error.message),
		)
	}
}

// DELETE
exports.deleteBooking = async (req, res) => {
	try {
		const { id } = req.params
		const [rows] = await db.execute("SELECT * FROM bookings WHERE id = ?", [id])

		if (rows.length) {
			// Hapus event kalender dulu (best-effort)
			await googleCalendar.deleteEvent(rows[0])
		}

		await db.execute("DELETE FROM bookings WHERE id = ?", [id])
		res.redirect("/admin/bookings?success=" + encodeURIComponent("Booking berhasil dihapus"))
	} catch (error) {
		console.error("Delete booking error:", error)
		res.redirect("/admin/bookings?error=" + encodeURIComponent(error.message))
	}
}

// SINKRON ULANG MANUAL
exports.resyncBooking = async (req, res) => {
	try {
		const { id } = req.params
		await syncBookingToCalendar(id)
		res.redirect(
			"/admin/bookings?success=" + encodeURIComponent("Sinkronisasi kalender dijalankan"),
		)
	} catch (error) {
		console.error("Resync booking error:", error)
		res.redirect("/admin/bookings?error=" + encodeURIComponent(error.message))
	}
}
