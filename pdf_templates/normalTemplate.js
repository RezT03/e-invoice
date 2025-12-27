const PDFDocument = require("pdfkit")
const path = require("path")
const fs = require("fs")
const {
	generateInvoiceQRCode,
} = require("../utils/qrCodeGenerator")

module.exports = async function (invoice) {
	return new Promise(async (resolve, reject) => {
		try {
			// 1. LOGIKA PATH GAMBAR
			// Ambil nama file saja dari path database
			let logoFile = null
			if (invoice.logo_path) {
				logoFile = path.basename(invoice.logo_path)
			}

			// Default Tanda Tangan
			if (!invoice.ttd) invoice.ttd = "respro_ttd.png"

			const doc = new PDFDocument({ size: "A4", margin: 50 })
			const buffers = []
			doc.on("data", buffers.push.bind(buffers))
			doc.on("end", () => resolve(Buffer.concat(buffers)))

			// ======================= HEADER SECTION =======================
			
			const headerY = 45
			let logoWidth
			if (invoice.company_name != "Restu Production") {
				logoWidth = 60
			} else {
				logoWidth = 150
			}
			// Variable untuk posisi vertikal teks Company (default di atas)
			let companyTextY = headerY 
			
			// A. LOGO (KIRI ATAS)
			if (logoFile) {
				const logoPath = path.join(__dirname, "../public/img", logoFile)
				if (fs.existsSync(logoPath)) {
					// Render Logo di koordinat (50, 45)
					doc.image(logoPath, 50, headerY, { width: logoWidth })
					
					// Karena ada logo, teks nama perusahaan turun ke bawah logo
					// (headerY + tinggi logo + padding)
					companyTextY = headerY + 70 
				}
			}

			// B. INFO PERUSAHAAN (DI BAWAH LOGO, RATA KIRI)
			doc.fillColor("black")
			doc.fontSize(14).font("Helvetica-Bold")
				.text(invoice.company_name, 50, companyTextY)
			
			doc.fontSize(9).font("Helvetica").fillColor("#444444")
				.text(invoice.company_address || "", 50, companyTextY + 20, {
					width: 280, 
					align: "left"
				})
				.text(invoice.company_phone || "", 50, doc.y)

			// C. META DATA INVOICE (POJOK KANAN ATAS)
			// Tetap di posisi atas (sejajar dengan posisi Logo)
			const metaX = 400
			const metaY = headerY 
			
			doc.fillColor("black")
			
			// No Invoice
			doc.fontSize(10).font("Helvetica-Bold").text("No. Invoice:", metaX, metaY)
			doc.font("Helvetica").text(invoice.invoice_number, metaX, metaY + 12)

			// Tanggal
			doc.fontSize(10).font("Helvetica-Bold").text("Tanggal:", metaX, metaY + 30)
			doc.font("Helvetica").text(formatTanggal(invoice.invoice_date), metaX, metaY + 42)

			// Garis Pembatas Header
			// Hitung posisi Y terendah antara teks alamat atau metadata, lalu tambah jarak
			const lineY = Math.max(doc.y, metaY + 60) + 60 
			doc.moveTo(50, lineY).lineTo(545, lineY).lineWidth(1.5).stroke("#000000")


			// ======================= INFO PENERIMA & JUDUL =======================
			
			let contentY = lineY + 15

			// Judul "INVOICE" Besar
			doc.fontSize(16).font("Helvetica-Bold").text("INVOICE", 50, contentY)
			
			contentY += 35
			
			// Info Kepada
			doc.fontSize(10).font("Helvetica-Bold").text("Kepada:", 50, contentY)
			doc.fontSize(11).text(invoice.recipient_name, 50, contentY + 15)
			
			if (invoice.recipient_address) {
				doc.fontSize(10).font("Helvetica").fillColor("#333333")
					.text(invoice.recipient_address, 50, contentY + 30, { width: 300 })
			}

			// Info Jatuh Tempo (Kanan, sejajar Kepada)
			if (invoice.due_date) {
				doc.fontSize(10).fillColor("black")
					.font("Helvetica-Bold").text("Jatuh Tempo:", 400, contentY)
					.font("Helvetica").text(formatTanggal(invoice.due_date), 400, contentY + 15)
			}


			// ======================= TABEL BARANG =======================
			
			const tableTop = contentY + 60
			const col = {
				no: 50,
				desc: 85,
				qty: 290,
				unit: 340,
				price: 400,
				total: 480
			}

			// Header Tabel
			doc.rect(50, tableTop, 495, 25).fill("#eeeeee")
			
			doc.fillColor("black").fontSize(9).font("Helvetica-Bold")
			const headerTextY = tableTop + 8
			
			doc.text("NO", col.no, headerTextY, { width: 30, align: "center" })
			doc.text("DESKRIPSI", col.desc, headerTextY)
			doc.text("QTY", col.qty, headerTextY, { width: 40, align: "center" })
			doc.text("SATUAN", col.unit, headerTextY, { width: 50, align: "center" })
			doc.text("HARGA", col.price, headerTextY, { width: 75, align: "center" })
			doc.text("TOTAL", col.total, headerTextY, { width: 65, align: "center" })

			// Isi Tabel
			let y = tableTop + 25
			doc.font("Helvetica").fontSize(9)

			;(invoice.items || []).forEach((item, i) => {
				const itemDesc = item.description || item.name || ""
				const descHeight = doc.heightOfString(itemDesc, { width: col.qty - col.desc - 10 })
				const rowHeight = Math.max(descHeight + 10, 25)

				// Zebra Striping
				if (i % 2 === 1) doc.rect(50, y, 495, rowHeight).fill("#fafafa")
				
				doc.fillColor("black")

				doc.text(i + 1, col.no, y + 6, { width: 30, align: "center" })
				doc.text(itemDesc, col.desc, y + 6, { width: col.qty - col.desc - 10 })
				doc.text(item.quantity || item.qty || 0, col.qty, y + 6, { width: 40, align: "center" })
				doc.text(item.unit || "-", col.unit, y + 6, { width: 50, align: "center" })
				doc.text(formatRupiah(item.price || item.unit_price), col.price, y + 6, { width: 75, align: "right" })
				
				const lineTotal = (item.quantity || item.qty || 0) * (item.price || item.unit_price || 0)
				doc.text(formatRupiah(lineTotal), col.total, y + 6, { width: 65, align: "right" })

				doc.moveTo(50, y + rowHeight).lineTo(545, y + rowHeight).lineWidth(0.5).stroke("#dddddd")
				
				y += rowHeight
			})


			// ======================= SUMMARY & FOOTER =======================
			
			y += 15
			
			// Hitung Total
			const subtotal = (invoice.items || []).reduce((sum, item) => sum + ((item.quantity || item.qty || 0) * (item.price || item.unit_price || 0)), 0)
			const discount = invoice.discount || 0
			let total = subtotal - discount

			// Summary Box (Kanan)
			const summaryXLabel = 350
			const summaryXValue = 450
			
			const drawSummary = (label, value, isBold = false) => {
				doc.font(isBold ? "Helvetica-Bold" : "Helvetica").fontSize(9)
				doc.text(label, summaryXLabel, y, { width: 90, align: "right" })
				doc.text(formatRupiah(value), summaryXValue, y, { width: 95, align: "right" })
				y += 16
			}

			drawSummary("Subtotal", subtotal)
			if (discount > 0) drawSummary("Diskon", discount)

			;(invoice.taxes || []).forEach(tax => {
				const taxAmount = Math.round(tax.amount || (subtotal * (tax.percentage || 0)) / 100)
				drawSummary(`${tax.name} (${tax.percentage}%)`, taxAmount)
				total += taxAmount
			})

			doc.moveTo(summaryXLabel, y).lineTo(545, y).lineWidth(1).stroke("black")
			y += 5
			drawSummary("Grand Total", total, true)


			// TANDA TANGAN (KIRI BAWAH)
			if (y > 700) {
				doc.addPage()
				y = 50
			} else {
				y = Math.max(y, y + 20)
			}

			doc.fontSize(10).font("Helvetica").text("Hormat Kami,", 55, y)
			
			try {
				const qrBuffer = await generateInvoiceQRCode({
					company_name: invoice.company_name,
					invoice_number: invoice.invoice_number,
					recipient_name: invoice.recipient_name,
					invoice_date: invoice.invoice_date,
				})
				doc.image(qrBuffer, 50, y + 15, { width: 80 })
			} catch (e) {
				const ttdPath = path.join(__dirname, "../public/", invoice.ttd)
				if (fs.existsSync(ttdPath)) {
					doc.image(ttdPath, 50, y + 15, { width: 70 })
				}
			}

			doc.fontSize(10).font("Helvetica-Bold").text(invoice.company_name, 50, y + 100)

			if (invoice.paid_date) {
				doc.fontSize(10).font("Helvetica-Bold").fillColor("green")
					.text("LUNAS", 250, y + 40)
					.fontSize(8).font("Helvetica-Oblique")
					.text(formatTanggal(invoice.paid_date), 250, y + 52)
			}

			doc.end()

		} catch (error) {
			console.error("PDF Generate Error:", error)
			reject(error)
		}
	})
}

// --- HELPER FUNCTIONS ---

function formatRupiah(num) {
	return "Rp " + Math.round(num || 0).toLocaleString("id-ID")
}

function formatTanggal(tgl) {
	if (!tgl) return "-"
	return new Date(tgl).toLocaleDateString("id-ID", {
		day: "2-digit",
		month: "long",
		year: "numeric",
	})
}