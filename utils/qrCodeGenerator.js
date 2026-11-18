const QRCode = require("qrcode")
const { DEFAULT_BASE_URL, normalizeBaseUrl } = require("./appUrl")

/**
 * Generate QR Code dari share token invoice
 * @param {String} shareToken - Share token untuk akses invoice
 * @param {String} baseUrl - Base URL aplikasi (opsional, default: domain produksi)
 * @returns {Promise<Buffer>} QR Code dalam format PNG buffer
 */
async function generateInvoiceQRCode(
	shareToken,
	baseUrl = DEFAULT_BASE_URL,
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
function formatQRText(share_token, baseUrl = DEFAULT_BASE_URL) {
	const origin = normalizeBaseUrl(baseUrl) || DEFAULT_BASE_URL

	// Jika share_token tidak ada, kembalikan string kosong
	if (!share_token) {
		console.warn("[QR] share_token kosong/null!")
		return ""
	}

	const s = String(share_token).trim()
	// Jika sudah berbentuk URL, kembalikan apa adanya
	if (/^https?:\/\//i.test(s)) {
		return s
	}

	// Jika token mengandung tanda '/', kemungkinan sudah path lengkap -> prepend origin
	if (s.includes("/")) {
		return s.startsWith("/") ? `${origin}${s}` : `${origin}/${s}`
	}

	// Default: treat as pure token
	return `${origin}/invoice/share/${s}`
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
 * @param {String} baseUrl - Base URL aplikasi (opsional, default: domain produksi)
 * @returns {Promise<String>} Path file QR code yang disimpan
 */
async function generateInvoiceQRCodeAsFile(
	shareToken,
	outputPath,
	baseUrl = DEFAULT_BASE_URL,
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
