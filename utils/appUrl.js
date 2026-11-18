// URL publik aplikasi yang dipakai untuk share link / QR code invoice.
const DEFAULT_BASE_URL = "https://e-invoice.restuproduction.com"

function normalizeBaseUrl(value) {
	if (!value) return ""
	return String(value).trim().replace(/\/+$/, "")
}

function isLocalHost(host) {
	return /^(localhost|127\.0\.0\.1|\[?::1\]?)(:\d+)?$/i.test(String(host || "").trim())
}

function getRequestHost(req) {
	if (!req) return ""

	const forwarded = req.headers && req.headers["x-forwarded-host"]
	const host = typeof forwarded === "string"
		? forwarded.split(",")[0].trim()
		: req.get && req.get("host")

	return String(host || "").trim()
}

function getRequestProtocol(req) {
	if (!req) return "https"

	const forwarded = req.headers && req.headers["x-forwarded-proto"]
	const protocol = typeof forwarded === "string"
		? forwarded.split(",")[0].trim()
		: req.protocol

	return String(protocol || "https").trim()
}

/**
 * Tentukan base URL untuk QR/share link.
 * Prioritas:
 * 1. Host asli dari request (mendukung reverse proxy via X-Forwarded-*)
 * 2. BASE_URL dari environment
 * 3. Domain produksi default
 *
 * Host lokal (localhost/127.0.0.1) dilewati agar QR tidak pernah
 * mengarah ke mesin development.
 */
function getBaseUrl(req) {
	const host = getRequestHost(req)
	if (host && !isLocalHost(host)) {
		return `${getRequestProtocol(req)}://${host}`
	}

	if (process.env.BASE_URL) {
		return normalizeBaseUrl(process.env.BASE_URL)
	}

	return DEFAULT_BASE_URL
}

module.exports = { getBaseUrl, normalizeBaseUrl, DEFAULT_BASE_URL }
