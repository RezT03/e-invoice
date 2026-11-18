const db = require("../db/connection")
const { v4: uuidv4 } = require("uuid")

const PER_PAGE = 20

// Opsi urutan daftar produk (whitelist agar aman dari SQL injection)
const PRODUCT_SORT_OPTIONS = {
	name_asc: "p.name ASC",
	name_desc: "p.name DESC",
	sku_asc: "p.sku ASC",
	rental_price_desc: "p.rental_price DESC",
	rental_price_asc: "p.rental_price ASC",
	stock_desc: "p.stock_available DESC",
	stock_asc: "p.stock_available ASC",
	created_at_desc: "p.created_at DESC",
}
const DEFAULT_SORT = "name_asc"

function resolveSort(sortParam) {
	const sort = Object.prototype.hasOwnProperty.call(
		PRODUCT_SORT_OPTIONS,
		sortParam,
	)
		? sortParam
		: DEFAULT_SORT
	return { sort, orderBy: PRODUCT_SORT_OPTIONS[sort] }
}

// Angka aman (>= 0) dari input form
function toNonNegativeInt(value) {
	const n = parseInt(value, 10)
	if (isNaN(n) || n < 0) return 0
	return n
}

function toDecimal(value) {
	const n = parseFloat(value)
	if (isNaN(n) || n < 0) return 0
	return n
}

// LIST PRODUK
exports.getProducts = async (req, res) => {
	try {
		const page = parseInt(req.query.page) || 1
		const offset = (page - 1) * PER_PAGE

		const search = req.query.search || ""
		const category = req.query.category || ""
		const statusFilter = req.query.status || ""
		const { sort, orderBy } = resolveSort(req.query.sort)

		let whereClause = "WHERE 1=1"
		const params = []

		if (search) {
			whereClause += " AND (p.name LIKE ? OR p.sku LIKE ?)"
			params.push(`%${search}%`, `%${search}%`)
		}
		if (category) {
			whereClause += " AND p.category = ?"
			params.push(category)
		}
		if (statusFilter === "active") {
			whereClause += " AND p.is_active = 1"
		} else if (statusFilter === "inactive") {
			whereClause += " AND p.is_active = 0"
		}

		const [rows] = await db.query(
			`SELECT p.*
       FROM products p
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
			[...params, PER_PAGE, offset],
		)

		const [countResult] = await db.execute(
			`SELECT COUNT(*) AS total FROM products p ${whereClause}`,
			params,
		)
		const totalProducts = countResult[0].total
		const totalPages = Math.ceil(totalProducts / PER_PAGE)

		// Daftar kategori yang sudah dipakai (untuk dropdown filter)
		const [categoryRows] = await db.query(
			`SELECT DISTINCT category FROM products
       WHERE category IS NOT NULL AND category <> ''
       ORDER BY category ASC`,
		)
		const categories = categoryRows.map((r) => r.category)

		res.render("pages/admin/products", {
			products: rows,
			currentPage: page,
			totalPages,
			totalProducts,
			search,
			category,
			statusFilter,
			sort,
			categories,
			success: req.query.success || null,
			error: req.query.error || null,
		})
	} catch (error) {
		console.error("Product list error:", error)
		res.status(500).send("Terjadi kesalahan: " + error.message)
	}
}

// FORM CREATE
exports.showCreateForm = async (req, res) => {
	try {
		const [categoryRows] = await db.query(
			`SELECT DISTINCT category FROM products
       WHERE category IS NOT NULL AND category <> ''
       ORDER BY category ASC`,
		)
		res.render("pages/admin/product-form", {
			product: null,
			categories: categoryRows.map((r) => r.category),
			error: req.query.error || null,
		})
	} catch (error) {
		console.error("Product form error:", error)
		res.status(500).send("Terjadi kesalahan: " + error.message)
	}
}

// CREATE
exports.createProduct = async (req, res) => {
	try {
		const id = uuidv4()
		const {
			sku,
			name,
			category,
			unit,
			rental_price,
			purchase_price,
			stock_total,
			stock_available,
			notes,
			is_active,
		} = req.body

		if (!sku || !name) {
			return res.redirect(
				"/admin/products/create?error=" +
					encodeURIComponent("SKU dan nama produk wajib diisi"),
			)
		}

		const total = toNonNegativeInt(stock_total)
		// Bila stok tersedia tidak diisi, anggap sama dengan total
		const available =
			stock_available === undefined || stock_available === ""
				? total
				: toNonNegativeInt(stock_available)

		await db.execute(
			`INSERT INTO products
        (id, sku, name, category, unit, rental_price, purchase_price,
         stock_total, stock_available, notes, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				id,
				sku.trim(),
				name.trim(),
				category || null,
				unit || "unit",
				toDecimal(rental_price),
				toDecimal(purchase_price),
				total,
				available,
				notes || null,
				is_active ? 1 : 0,
			],
		)

		res.redirect(
			"/admin/products?success=" + encodeURIComponent("Produk berhasil ditambahkan"),
		)
	} catch (error) {
		console.error("Create product error:", error)
		const message =
			error.code === "ER_DUP_ENTRY"
				? "SKU sudah dipakai produk lain"
				: error.message
		res.redirect("/admin/products/create?error=" + encodeURIComponent(message))
	}
}

// FORM EDIT
exports.showEditForm = async (req, res) => {
	try {
		const { id } = req.params
		const [rows] = await db.execute("SELECT * FROM products WHERE id = ?", [id])
		if (!rows.length) {
			return res.status(404).send("Produk tidak ditemukan")
		}

		const [categoryRows] = await db.query(
			`SELECT DISTINCT category FROM products
       WHERE category IS NOT NULL AND category <> ''
       ORDER BY category ASC`,
		)

		res.render("pages/admin/product-form", {
			product: rows[0],
			categories: categoryRows.map((r) => r.category),
			error: req.query.error || null,
		})
	} catch (error) {
		console.error("Product edit form error:", error)
		res.status(500).send("Terjadi kesalahan: " + error.message)
	}
}

// UPDATE
exports.updateProduct = async (req, res) => {
	try {
		const { id } = req.params
		const {
			sku,
			name,
			category,
			unit,
			rental_price,
			purchase_price,
			stock_total,
			stock_available,
			notes,
			is_active,
		} = req.body

		if (!sku || !name) {
			return res.redirect(
				`/admin/products/${id}/edit?error=` +
					encodeURIComponent("SKU dan nama produk wajib diisi"),
			)
		}

		await db.execute(
			`UPDATE products
       SET sku=?, name=?, category=?, unit=?, rental_price=?, purchase_price=?,
           stock_total=?, stock_available=?, notes=?, is_active=?
       WHERE id=?`,
			[
				sku.trim(),
				name.trim(),
				category || null,
				unit || "unit",
				toDecimal(rental_price),
				toDecimal(purchase_price),
				toNonNegativeInt(stock_total),
				toNonNegativeInt(stock_available),
				notes || null,
				is_active ? 1 : 0,
				id,
			],
		)

		res.redirect(
			"/admin/products?success=" + encodeURIComponent("Produk berhasil diperbarui"),
		)
	} catch (error) {
		console.error("Update product error:", error)
		const message =
			error.code === "ER_DUP_ENTRY"
				? "SKU sudah dipakai produk lain"
				: error.message
		res.redirect(
			`/admin/products/${req.params.id}/edit?error=` + encodeURIComponent(message),
		)
	}
}

// TOGGLE AKTIF / NONAKTIF
exports.toggleProductActive = async (req, res) => {
	try {
		const { id } = req.params
		await db.execute(
			"UPDATE products SET is_active = NOT is_active WHERE id = ?",
			[id],
		)
		res.redirect(
			"/admin/products?success=" +
				encodeURIComponent("Status produk berhasil diubah"),
		)
	} catch (error) {
		console.error("Toggle product error:", error)
		res.redirect("/admin/products?error=" + encodeURIComponent(error.message))
	}
}

// DELETE
exports.deleteProduct = async (req, res) => {
	try {
		const { id } = req.params
		await db.execute("DELETE FROM products WHERE id = ?", [id])
		res.redirect(
			"/admin/products?success=" + encodeURIComponent("Produk berhasil dihapus"),
		)
	} catch (error) {
		console.error("Delete product error:", error)
		res.redirect("/admin/products?error=" + encodeURIComponent(error.message))
	}
}
