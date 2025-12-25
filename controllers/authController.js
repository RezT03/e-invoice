const db = require("../db/connection")
const bcrypt = require("bcrypt")

exports.showLogin = (req, res) => {
	const returnUrl = req.query.return || "/admin/invoice/dashboard"
	res.render("pages/auth/login", { error: null, returnUrl })
}

exports.login = async (req, res) => {
	const { username, password } = req.body
	const returnUrl = req.body.return || "/admin/invoice/dashboard"

	try {
		const [rows] = await db.execute("SELECT * FROM admins WHERE username = ?", [
			username,
		])

		if (rows.length && (await bcrypt.compare(password, rows[0].password))) {
			req.session.admin = true
			req.session.adminId = rows[0].id
			res.redirect(returnUrl)
		} else {
			res.render("pages/auth/login", {
				error: "Username atau password salah",
				returnUrl,
			})
		}
	} catch (error) {
		console.error("Login error:", error)
		res.render("pages/auth/login", {
			error: "Terjadi kesalahan saat login",
			returnUrl,
		})
	}
}

exports.logout = (req, res) => {
	req.session.destroy(() => {
		res.redirect("/")
	})
}
