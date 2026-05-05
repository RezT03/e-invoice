const QRCode = require("qrcode")

/**
 * Generate QR Code dari share token invoice
 * @param {String} shareToken - Share token untuk akses invoice
 * @param {String} baseUrl - Base URL aplikasi (opsional, default: http://localhost:3000)
 * @returns {Promise<Buffer>} QR Code dalam format PNG buffer
 */
async function generateInvoiceQRCode(
	shareToken,
	baseUrl = "http://localhost:3000",
) {
	try {
		// QR Code menampilkan link share invoice
		const qrText = formatQRText(shareToken, baseUrl)

		// Generate QR Code
		const qrBuffer = await QRCode.toBuffer(qrText, {
			errorCorrectionLevel: "H",
			type: "image/png",
			width: 200,
			margin: 1,
			color: {
				dark: "#000000",
				light: "#FFFFFF",
			},
		})

		return qrBuffer
	} catch (error) {
		console.error("QR Code generation error:", error)
		throw error
	}
}

/**
 * Format teks QR Code
 * Format: URL lengkap ke invoice share link
 */
function formatQRText(share_token, baseUrl = "http://localhost:3000") {
	// Debug log
	console.log("🔍 formatQRText Debug:")
	console.log("  - share_token:", share_token)
	console.log("  - baseUrl:", baseUrl)

	// Jika share_token tidak ada, kembalikan string kosong
	if (!share_token) {
		console.warn("⚠️  share_token kosong/null!")
		return ""
	}

	const s = String(share_token).trim()
	// Jika sudah berbentuk URL, kembalikan apa adanya
	if (/^https?:\/\//i.test(s)) {
		console.log("  - Detected full URL, returning as-is")
		return s
	}

	// Jika token mengandung tanda '/', kemungkinan sudah path lengkap -> prepend origin if missing
	if (s.includes("/") && !/^https?:\/\//i.test(s)) {
		// treat as path
		const url = s.startsWith("/") ? `${baseUrl}${s}` : `${baseUrl}/${s}`
		console.log("  - Detected path token, generated URL:", url)
		return url
	}

	// Default: treat as pure token
	const qrUrl = `${baseUrl.replace(/\/$/, "")}/invoice/share/${s}`
	console.log("  - Generated URL:", qrUrl)
	return qrUrl
}

/**
 * Format tanggal untuk QR Code
 * Format: "hari tgl, bulan, tahun jam:menit:detik"
 */
function formatDateForQR(dateString) {
	if (!dateString) return ""

	const date = new Date(dateString)

	// Format: "Senin, 25 Desember 2025; 14:30:45"
	const options = {
		weekday: "long",
		day: "2-digit",
		month: "long",
		year: "numeric",
		// hour: "2-digit",
		// minute: "2-digit",
		// second: "2-digit",
		// hour12: false,
	}

	return date.toLocaleDateString("id-ID", options)
}

/**
 * Generate QR Code dan simpan ke file
 * @param {String} shareToken - Share token untuk akses invoice
 * @param {String} outputPath - Path untuk menyimpan file QR code
 * @param {String} baseUrl - Base URL aplikasi (opsional)
 * @returns {Promise<String>} Path file QR code yang disimpan
 */
async function generateInvoiceQRCodeAsFile(
	shareToken,
	outputPath,
	baseUrl = "http://localhost:3000",
) {
	try {
		const qrBuffer = await generateInvoiceQRCode(shareToken, baseUrl)
		const fs = require("fs")
		fs.writeFileSync(outputPath, qrBuffer)
		return outputPath
	} catch (error) {
		console.error("Error saving QR code:", error)
		throw error
	}
}

module.exports = {
	generateInvoiceQRCode,
	generateInvoiceQRCodeAsFile,
	formatQRText,
	formatDateForQR,
}
