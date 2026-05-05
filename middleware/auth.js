// Middleware untuk authentication admin

const db = require("../db/connection")

const checkAdminAuth = async (req, res, next) => {
	if (req.session.admin) {
		try {
			// Query data admin dari database berdasarkan adminId
			const [adminData] = await db.execute(
				"SELECT id, name FROM admins WHERE id = ?",
				[req.session.adminId],
			)

			if (adminData.length > 0) {
				// Set data admin ke res.locals agar bisa diakses di view
				res.locals.adminName = adminData[0].name
				res.locals.admins = adminData[0]
			}
		} catch (error) {
			console.error("Error fetching admin data:", error)
		}
		next()
	} else {
		// Redirect ke login dengan return URL
		res.redirect(`/auth/login?return=${encodeURIComponent(req.originalUrl)}`)
	}
}

const isAdmin = (req, res, next) => {
	if (req.session.admin) {
		res.locals.isAdmin = true
		next()
	} else {
		res.locals.isAdmin = false
		next()
	}
}

module.exports = {
	checkAdminAuth,
	isAdmin,
}
