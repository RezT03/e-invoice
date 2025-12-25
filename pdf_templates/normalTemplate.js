const PDFDocument = require("pdfkit")
const path = require("path")
const fs = require("fs")
const {
	generateInvoiceQRCode,
	formatQRText,
	formatDateForQR,
} = require("../utils/qrCodeGenerator")

module.exports = async function (invoice) {
	return new Promise(async (resolve, reject) => {
		try {
			// Set default logo jika tidak ada
			let logoFile = null
			// if (invoice.logo_path) {
			// 	// Remove 'img/' prefix if present to avoid double path
			// 	logoFile = invoice.logo_path
			// 	if (logoFile.startsWith("img/")) {
			// 		logoFile = logoFile.substring(4)
			// 	}
			// }
			// Always use logo.png as default if no logo_path specified
			if (!logoFile) logoFile = "logo.png"

			if (!invoice.ttd) invoice.ttd = "respro_ttd.png"

			const doc = new PDFDocument({ size: "A4", margin: 50 })
			const buffers = []
			doc.on("data", buffers.push.bind(buffers))
			doc.on("end", () => resolve(Buffer.concat(buffers)))

			// Header Section - Company Info & Logo
			// Tambahkan garis horizontal di atas
			doc.moveTo(50, 45).lineTo(545, 45).lineWidth(2).stroke()

			// Logo kanan atas (jika ada)
			if (logoFile) {
				const logoPath = path.join(__dirname, "../public/", logoFile)
				try {
					if (fs.existsSync(logoPath)) {
						doc.image(logoPath, 440, 50, { width: 95 })
					} else {
						console.warn("Logo file not found:", logoPath)
					}
				} catch (logoError) {
					console.warn("Error loading logo:", logoFile, logoError.message)
				}
			}

			// Company Name & Address (Kiri)
			doc.fontSize(20).font("Helvetica-Bold").text(invoice.company_name, 50, 55)

			doc
				.fontSize(10)
				.font("Helvetica")
				.text(invoice.company_address || "", 50, 85, {
					width: 330,
					align: "left",
				})

			doc.fontSize(10).text(invoice.company_phone || "", 50, 110)

			// Invoice Title (Kanan)
			doc
				.fontSize(28)
				.font("Helvetica-Bold")
				.text("INVOICE", 350, 60, { align: "right" })

			// Invoice Details (Kanan bawah)
			doc
				.fontSize(10)
				.font("Helvetica-Bold")
				.text("Invoice No", 350, 100, { align: "right", width: 195 })
			doc
				.fontSize(10)
				.font("Helvetica")
				.text(`: ${invoice.invoice_number}`, 400, 100)

			doc
				.fontSize(10)
				.font("Helvetica-Bold")
				.text("Tanggal", 350, 115, { align: "right", width: 195 })
			doc
				.fontSize(10)
				.font("Helvetica")
				.text(`: ${formatTanggal(invoice.invoice_date)}`, 400, 115)

			if (invoice.due_date) {
				doc
					.fontSize(10)
					.font("Helvetica-Bold")
					.text("Jatuh Tempo", 350, 130, { align: "right", width: 195 })
				doc
					.fontSize(10)
					.font("Helvetica")
					.text(`: ${formatTanggal(invoice.due_date)}`, 400, 130)
			}

			// Garis pemisah
			doc.moveTo(50, 150).lineTo(545, 150).lineWidth(0.5).stroke()

			// Info Penerima
			doc.fontSize(11).font("Helvetica-Bold").text("Kepada:", 50, 160)

			doc
				.fontSize(10)
				.font("Helvetica-Bold")
				.text(invoice.recipient_name, 50, 180)

			if (invoice.recipient_address) {
				doc
					.fontSize(10)
					.font("Helvetica")
					.text(invoice.recipient_address, 50, 195, {
						width: 250,
					})
			}

			// Invoice Details (Kolom Kanan) - Formatted properly
			doc
				.fontSize(10)
				.font("Helvetica-Bold")
				.text("Invoice No", 320, 160, { width: 70, align: "right" })
			doc.font("Helvetica").text(`: ${invoice.invoice_number}`, 395, 160)

			doc
				.fontSize(10)
				.font("Helvetica-Bold")
				.text("Tanggal", 320, 180, { width: 70, align: "right" })
			doc
				.font("Helvetica")
				.text(`: ${formatTanggal(invoice.invoice_date)}`, 395, 180)

			if (invoice.recipient_npwp) {
				doc
					.fontSize(10)
					.font("Helvetica-Bold")
					.text("NPWP", 320, 200, { width: 70, align: "right" })
				doc.font("Helvetica").text(`: ${invoice.recipient_npwp}`, 395, 200)
			}

			// Garis pemisah sebelum tabel
			doc.moveTo(50, 220).lineTo(545, 220).lineWidth(0.5).stroke()

			// Tabel Barang
			const tableTop = 235
			const col = {
				no: 55,
				desc: 90,
				qty: 280,
				unit: 345,
				unit_price: 410,
				total: 475,
				right: 540,
			}

			// Table Header - dengan background
			doc.save()
			doc
				.rect(col.no - 5, tableTop, col.right - col.no + 5, 22)
				.fillColor("#cccccc")
				.fill()
			doc.restore()

			doc.font("Helvetica-Bold").fontSize(10).fillColor("black")
			doc.text("No", col.no, tableTop + 6, {
				width: col.desc - col.no - 10,
				align: "center",
			})
			doc.text("Deskripsi", col.desc, tableTop + 6, {
				width: col.qty - col.desc - 10,
				align: "center",
			})
			doc.text("Qty", col.qty, tableTop + 6, {
				width: col.unit - col.qty - 10,
				align: "center",
			})
			doc.text("Satuan", col.unit, tableTop + 6, {
				width: col.unit_price - col.unit - 10,
				align: "center",
			})
			doc.text("Harga Satuan", col.unit_price, tableTop + 6, {
				width: col.total - col.unit_price - 10,
				align: "center",
			})
			doc.text("Total", col.total, tableTop + 6, {
				width: col.right - col.total - 5,
				align: "center",
			})

			// Table Rows
			let y = tableTop + 28
			doc.font("Helvetica").fontSize(10)
			;(invoice.items || []).forEach((item, i) => {
				const rowHeight = 20

				// Warna latar selang-seling
				if (i % 2 === 0) {
					doc.save()
					doc
						.rect(col.no - 5, y, col.right - col.no + 5, rowHeight)
						.fillColor("#f5f5f5")
						.fill()
					doc.restore()
				}

				// Border bawah tiap baris
				doc
					.moveTo(col.no - 5, y + rowHeight)
					.lineTo(col.right, y + rowHeight)
					.lineWidth(0.5)
					.stroke()

				// Teks isi baris
				doc.fillColor("black")
				doc.text(i + 1, col.no, y + 3, {
					width: col.desc - col.no - 10,
					align: "center",
				})
				doc.text(item.description || item.name || "", col.desc, y + 3, {
					width: col.qty - col.desc - 10,
					align: "left",
				})
				doc.text(item.quantity || item.qty || 0, col.qty, y + 3, {
					width: col.unit - col.qty - 10,
					align: "center",
				})
				doc.text(item.unit || "", col.unit, y + 3, {
					width: col.unit_price - col.unit - 10,
					align: "center",
				})
				doc.text(
					formatRupiah(item.price || item.unit_price || 0),
					col.unit_price,
					y + 3,
					{
						width: col.total - col.unit_price - 10,
						align: "right",
					},
				)
				doc.text(
					formatRupiah(
						(item.quantity || item.qty || 0) *
							(item.price || item.unit_price || 0),
					),
					col.total,
					y + 3,
					{
						width: col.right - col.total - 5,
						align: "right",
					},
				)
				y += rowHeight
			})

			// Summary Section - dengan spacing lebih baik
			y += 15
			let subtotal = (invoice.items || []).reduce(
				(sum, item) =>
					sum +
					(item.quantity || item.qty || 0) *
						(item.price || item.unit_price || 0),
				0,
			)
			let discount = invoice.discount || 0
			let total = subtotal - discount

			// Garis pemisah
			doc
				.moveTo(col.total - 5, y)
				.lineTo(col.right, y)
				.lineWidth(1)
				.stroke()

			y += 10

			// Summary items - dengan kolom terpisah untuk label dan nilai
			const summaryLabelCol = 340
			const summaryValueCol = 430

			doc.fontSize(10)

			// Subtotal
			doc.font("Helvetica").text("Subtotal:", summaryLabelCol, y, {
				align: "left",
			})
			doc.font("Helvetica").text(formatRupiah(subtotal), summaryValueCol, y, {
				align: "right",
				width: 110,
			})
			y += 16

			if (discount > 0) {
				doc.font("Helvetica").text("Diskon:", summaryLabelCol, y, {
					align: "left",
				})
				doc.font("Helvetica").text(formatRupiah(discount), summaryValueCol, y, {
					align: "right",
					width: 110,
				})
				y += 16
			}

			// Display taxes
			;(invoice.taxes || []).forEach((tax) => {
				const taxAmount = tax.amount || (subtotal * (tax.percentage || 0)) / 100
				doc
					.font("Helvetica")
					.text(`${tax.name} (${tax.percentage || 0}%):`, summaryLabelCol, y, {
						align: "left",
					})
				doc
					.font("Helvetica")
					.text(formatRupiah(taxAmount), summaryValueCol, y, {
						align: "right",
						width: 110,
					})
				total += taxAmount
				y += 16
			})

			// Garis pemisah sebelum total
			doc
				.moveTo(col.total - 5, y + 2)
				.lineTo(col.right, y + 2)
				.lineWidth(1.5)
				.stroke()

			y += 10

			// TOTAL - dengan highlight dan format sama dengan subtotal
			doc.fontSize(10).font("Helvetica").text("Total:", summaryLabelCol, y, {
				align: "left",
			})
			doc
				.font("Helvetica-Bold")
				.fontSize(10)
				.text(formatRupiah(total), summaryValueCol, y, {
					align: "right",
					width: 110,
				})

			// Footer Section
			y += 30
			doc.fontSize(10).font("Helvetica").text("Hormat Kami,", 70, y)

			// Generate QR Code untuk signature
			try {
				const qrBuffer = await generateInvoiceQRCode({
					company_name: invoice.company_name,
					invoice_number: invoice.invoice_number,
					recipient_name: invoice.recipient_name,
					invoice_date: invoice.invoice_date,
				})

				// Tampilkan QR Code sebagai pengganti signature
				doc.image(qrBuffer, 60, y + 15, { width: 85 })
			} catch (error) {
				console.error("Error generating QR code:", error)
				// Jika QR gagal, gunakan signature gambar jika ada
				if (invoice.ttd) {
					const ttdPath = path.join(__dirname, "../public/", invoice.ttd)
					try {
						doc.image(ttdPath, 60, y + 15, { width: 60 })
					} catch (ttdError) {
						console.warn("TTD image not found:", ttdError.message)
					}
				}
			}

			y += 110
			doc.font("Helvetica-Bold").fontSize(10).text(invoice.company_name, 60, y)

			// Tanggal pembayaran (jika ada)
			if (invoice.paid_date) {
				y += 12
				doc
					.font("Helvetica-Oblique")
					.fillColor("green")
					.fontSize(9)
					.text(`✓ Terbayar pada: ${formatTanggal(invoice.paid_date)}`, 50, y)
				doc.fillColor("black")
			}

			doc.end()
		} catch (error) {
			console.error("PDF generation error:", error)
			reject(error)
		}
	})
}

function formatRupiah(num) {
	// Round to nearest integer to avoid .00 decimals
	const rounded = Math.round(num || 0)
	return "Rp " + rounded.toLocaleString("id-ID")
}
function formatTanggal(tgl) {
	if (!tgl) return "-"
	const d = new Date(tgl)
	return d.toLocaleDateString("id-ID", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	})
}
