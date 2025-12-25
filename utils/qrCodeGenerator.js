const QRCode = require("qrcode")

/**
 * Generate QR Code dari informasi invoice
 * @param {Object} invoice - Data invoice
 * @param {String} invoice.company_name - Nama perusahaan
 * @param {String} invoice.invoice_number - Nomor invoice
 * @param {String} invoice.recipient_name - Nama penerima
 * @param {String} invoice.invoice_date - Tanggal invoice
 * @returns {Promise<Buffer>} QR Code dalam format PNG buffer
 */
async function generateInvoiceQRCode(invoice) {
	try {
		// Buat teks QR Code sesuai format yang diminta
		const qrText = formatQRText(
			invoice.company_name,
			invoice.invoice_number,
			invoice.recipient_name,
			invoice.invoice_date,
		)

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
 * Format: "Faktur ini dikeluarkan oleh {company} dengan nomor {inv.no} yang ditujukan kepada {recipient} pada tanggal {date}."
 */
function formatQRText(company, invoiceNumber, recipient, invoiceDate) {
	const formattedDate = formatDateForQR(invoiceDate)

	return `Faktur ini dikeluarkan oleh ${company} dengan nomor ${invoiceNumber} yang ditujukan kepada ${recipient} pada tanggal ${formattedDate}.`
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
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	}

	return date.toLocaleDateString("id-ID", options)
}

/**
 * Generate QR Code dan simpan ke file
 */
async function generateInvoiceQRCodeAsFile(invoice, outputPath) {
	try {
		const qrBuffer = await generateInvoiceQRCode(invoice)
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
