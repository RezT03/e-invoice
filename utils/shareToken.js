const crypto = require("crypto")

// 16 hex karakter = 64 bit entropi, cukup pendek untuk URL tapi aman dari tabrakan.
const SHARE_TOKEN_BYTES = 8

function generateShareToken() {
	return crypto.randomBytes(SHARE_TOKEN_BYTES).toString("hex")
}

module.exports = { generateShareToken, SHARE_TOKEN_BYTES }
