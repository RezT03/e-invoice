// Middleware untuk authentication admin

const checkAdminAuth = (req, res, next) => {
	if (req.session.admin) {
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
