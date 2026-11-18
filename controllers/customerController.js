const db = require("../db/connection")
const { v4: uuidv4 } = require("uuid")

const PER_PAGE = 20

// Opsi urutan daftar pelanggan (whitelist agar aman dari SQL injection)
const CUSTOMER_SORT_OPTIONS = {
	name_asc: "c.name ASC",
	name_desc: "c.name DESC",
	company_asc: "c.company ASC",
	created_at_desc: "c.created_at DESC",
	created_at_asc: "c.created_at ASC",
}
const DEFAULT_SORT = "name_asc"

function resolveSort(sortParam) {
	const sort = Object.prototype.hasOwnProperty.call(
		CUSTOMER_SORT_OPTIONS,
		sortParam,
	)
		? sortParam
		: DEFAULT_SORT
	return { sort, orderBy: CUSTOMER_SORT_OPTIONS[sort] }
}

// LIST PELANGGAN
exports.getCustomers = async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1
		const offset = (page - 1) * PER_PAGE

		const search = req.query.search || ""
		const statusFilter = req.query.status || ""
		const { sort, orderBy } = resolveSort(req.query.sort)

		let whereClause = "WHERE 1=1"
		const params = []

		if (search) {
			whereClause +=
				" AND (c.name LIKE ? OR c.company LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)"
			params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
		}
		if (statusFilter === "active") {
			whereClause += " AND c.is_active = 1"
		} else if (statusFilter === "inactive") {
			whereClause += " AND c.is_active = 0"
		}

		const [rows] = await db.query(
			`SELECT c.*
       FROM customers c
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
			[...params, PER_PAGE, offset],
		)

		const [countResult] = await db.execute(
			`SELECT COUNT(*) AS total FROM customers c ${whereClause}`,
			params,
		)
		const totalCustomers = countResult[0].total
		const totalPages = Math.ceil(totalCustomers / PER_PAGE)

		res.render("pages/admin/customers", {
			customers: rows,
			currentPage: page,
			totalPages,
			totalCustomers,
			search,
			statusFilter,
			sort,
			success: req.query.success || null,
			error: req.query.error || null,
		})
	} catch (error) {
		console.error("Customer list error:", error)
		res.status(500).send("Terjadi kesalahan: " + error.message)
	}
}

// FORM CREATE
exports.showCreateForm = async (req, res) => {
	try {
		res.render("pages/admin/customer-form", {
			customer: null,
			error: req.query.error || null,
		})
	} catch (error) {
		console.error("Customer form error:", error)
		res.status(500).send("Terjadi kesalahan: " + error.message)
	}
}

// CREATE
exports.createCustomer = async (req, res) => {
	try {
		const id = uuidv4()
		const {
			name,
			company,
			phone,
			email,
			npwp,
			address,
			city,
			notes,
			is_active,
		} = req.body

		if (!name) {
			return res.redirect(
				"/admin/customers/create?error=" +
					encodeURIComponent("Nama pelanggan wajib diisi"),
			)
		}

		await db.execute(
			`INSERT INTO customers
        (id, name, company, phone, email, npwp, address, city, notes, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				name.trim(),
				company || null,
				phone || null,
				email || null,
				npwp || null,
				address || null,
				city || null,
				notes || null,
				is_active ? 1 : 0,
			],
		)

		res.redirect(
			"/admin/customers?success=" + encodeURIComponent("Pelanggan berhasil ditambahkan"),
		)
	} catch (error) {
		console.error("Create customer error:", error)
		res.redirect("/admin/customers/create?error=" + encodeURIComponent(error.message))
	}
}

// FORM EDIT
exports.showEditForm = async (req, res) => {
	try {
		const { id } = req.params
		const [rows] = await db.execute("SELECT * FROM customers WHERE id = ?", [id])
		if (!rows.length) {
			return res.status(404).send("Pelanggan tidak ditemukan")
		}
		res.render("pages/admin/customer-form", {
			customer: rows[0],
			error: req.query.error || null,
		})
	} catch (error) {
		console.error("Customer edit form error:", error)
		res.status(500).send("Terjadi kesalahan: " + error.message)
	}
}

// UPDATE
exports.updateCustomer = async (req, res) => {
	try {
		const { id } = req.params
		const {
			name,
			company,
			phone,
			email,
			npwp,
			address,
			city,
			notes,
			is_active,
		} = req.body

		if (!name) {
			return res.redirect(
				`/admin/customers/${id}/edit?error=` +
					encodeURIComponent("Nama pelanggan wajib diisi"),
			)
		}

		await db.execute(
			`UPDATE customers
       SET name=?, company=?, phone=?, email=?, npwp=?, address=?, city=?, notes=?, is_active=?
       WHERE id=?`,
			[
				name.trim(),
				company || null,
				phone || null,
				email || null,
				npwp || null,
				address || null,
				city || null,
				notes || null,
				is_active ? 1 : 0,
				id,
			],
		)

		res.redirect(
			"/admin/customers?success=" + encodeURIComponent("Pelanggan berhasil diperbarui"),
		)
	} catch (error) {
		console.error("Update customer error:", error)
		res.redirect(
			`/admin/customers/${req.params.id}/edit?error=` +
				encodeURIComponent(error.message),
		)
	}
}

// TOGGLE AKTIF / NONAKTIF
exports.toggleCustomerActive = async (req, res) => {
	try {
		const { id } = req.params
		await db.execute(
			"UPDATE customers SET is_active = NOT is_active WHERE id = ?",
			[id],
		)
		res.redirect(
			"/admin/customers?success=" +
				encodeURIComponent("Status pelanggan berhasil diubah"),
		)
	} catch (error) {
		console.error("Toggle customer error:", error)
		res.redirect("/admin/customers?error=" + encodeURIComponent(error.message))
	}
}

// DELETE
exports.deleteCustomer = async (req, res) => {
	try {
		const { id } = req.params
		await db.execute("DELETE FROM customers WHERE id = ?", [id])
		res.redirect(
			"/admin/customers?success=" + encodeURIComponent("Pelanggan berhasil dihapus"),
		)
	} catch (error) {
		console.error("Delete customer error:", error)
		res.redirect("/admin/customers?error=" + encodeURIComponent(error.message))
	}
}
