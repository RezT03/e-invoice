const PDFDocument = require("pdfkit")
const path = require("path")

module.exports = function (invoice) {
	return new Promise((resolve) => {
		// Set default logo jika tidak ada
		if (!invoice.logo) invoice.logo = "logo.png"

		const doc = new PDFDocument({ size: "A4", margin: 50 })
		const buffers = []
		doc.on("data", buffers.push.bind(buffers))
		doc.on("end", () => resolve(Buffer.concat(buffers)))

		// Header Kiri
		doc.fontSize(22).font("Helvetica-Bold").text(invoice.company_name, 50, 50)

		// Batasi area alamat
		const alamatMaxWidth = 250
		const alamatMaxHeight = 60
		const alamatStartY = 80

		let alamatResult = doc
			.fontSize(11)
			.font("Helvetica")
			.text(invoice.company_address, 50, alamatStartY, {
				width: alamatMaxWidth,
				height: alamatMaxHeight,
				ellipsis: true,
			})

		// Cek apakah alamat melewati batas tengah halaman (misal Y > 400)
		let nextY = alamatResult.y + 10
		if (nextY > 400) nextY = 400

		// Nomor telepon dan elemen berikutnya
		doc.text(
			`${invoice.company_phone || ""}${
				invoice.company_phone && invoice.company_phone2 ? "/ " : ""
			}${invoice.company_phone2 || ""}`,
			50,
			nextY,
		)

		// Logo kanan atas (jika ada)
		if (invoice.logo) {
			const logoPath = path.join(__dirname, "../public/img", invoice.logo)
			doc.image(logoPath, 423, 80, { width: 120 })
		}

		// Header Kanan
		doc
			.fontSize(20)
			.font("Helvetica-Bold")
			.text("INVOICE", 400, 50, { align: "right" })

		// Info Kepada & Invoice
		doc.fontSize(11).font("Helvetica-Bold").text("Kepada", 50, 150)
		let yNama = doc.font("Helvetica").text(invoice.recipient_name, 50, 170, {
			width: 250,
		}).y
		doc.text(invoice.recipient_address, 50, yNama + 2, { width: 230 })

		doc.font("Helvetica-Bold").text("Invoice No", 320, 150)
		doc.font("Helvetica").text(`  : ${invoice.invoice_number}`, 400, 150)
		doc.font("Helvetica-Bold").text("Tanggal Invoice", 320, 170)
		doc
			.font("Helvetica")
			.text(`  : ${formatTanggal(invoice.invoice_date)}`, 400, 170)

		// Tabel Barang
		const tableTop = 230
		const col = {
			no: 50,
			desc: 80,
			qty: 270,
			unit: 330,
			total: 370,
			right: 540,
		}

		// Table Header
		doc
			.lineWidth(1)
			.rect(col.no, tableTop, col.right - col.no, 25)
			.stroke()
		doc.font("Helvetica-Bold").fontSize(11)
		doc.text("No", col.no, tableTop + 7, {
			width: col.desc - col.no,
			align: "center",
		})
		doc.text("Nama", col.desc, tableTop + 7, {
			width: col.qty - col.desc,
			align: "center",
		})
		doc.text("Kuantitas", col.qty, tableTop + 7, {
			width: col.unit - col.qty,
			align: "center",
		})
		doc.text("Satuan", col.unit, tableTop + 7, {
			width: col.total - col.unit+25,
			align: "center",
		})
		doc.text("Total", col.total, tableTop + 7, {
			width: col.right - col.total,
			align: "center",
		})

		// Table Rows
		let y = tableTop + 25
		doc.font("Helvetica").fontSize(11)
		;(invoice.items || []).forEach((item, i) => {
			// Warna latar selang-seling
			if (i % 2 === 0) {
				doc.save()
				doc
					.rect(col.no, y, col.right - col.no, 25)
					.fillColor("#e3f0fa") // biru muda
					.fill()
				doc.restore()
			}
			// Teks isi baris
			doc.fillColor("black")
			doc.text(i + 1, col.no, y + 7, {
				width: col.desc - col.no,
				align: "center",
			})
			doc.text(item.name, col.desc, y + 7, {
				width: col.qty - col.desc,
				align: "center",
			})
			doc.text(item.qty, col.qty, y + 7, {
				width: col.unit - col.qty,
				align: "center",
			})
			doc.text(item.unit, col.unit, y + 7, {
				width: col.total - col.unit+25,
				align: "center",
			})
			doc.text(formatRupiah(item.qty * item.unit_price), col.total - 5, y + 7, {
				width: col.right - col.total,
				align: "right",
			})
			// Garis kotak tiap baris (opsional)
			doc
				.lineWidth(1)
				.rect(col.no, y, col.right - col.no, 25)
				.stroke()
			y += 25
		})

		// Summary
		y += 10
		let subtotal = (invoice.items || []).reduce(
			(sum, item) => sum + item.qty * item.unit_price,
			0,
		)
		let discount = invoice.discount || 0
		let taxPercent =
			(invoice.taxes && invoice.taxes[0] && invoice.taxes[0].percent) || 0
		let taxName =
			(invoice.taxes && invoice.taxes[0] && invoice.taxes[0].name) || "PAJAK"
		let taxValue = subtotal * (taxPercent / 100)
		let total = subtotal - discount + taxValue

		doc.font("Helvetica-Bold").text("SUBTOTAL", col.total, y, {
			width: col.right - col.total,
			align: "left",
		})
		doc
			.font("Helvetica")
			.text(formatRupiah(subtotal), col.total + 10, y, { align: "right" })
		y += 18
		doc.font("Helvetica-Bold").text("DISKON", col.total, y, {
			width: col.right - col.total,
			align: "left",
		})
		doc
			.font("Helvetica")
			.text(formatRupiah(discount), col.total + 10, y, { align: "right" })
		y += 18
		doc.font("Helvetica-Bold").text("RASIO PAJAK", col.total, y, {
			width: col.right - col.total,
			align: "left",
		})
		doc
			.font("Helvetica")
			.text(`${taxPercent.toFixed(2)}%`, col.total + 10, y, { align: "right" })
		y += 18
		doc.font("Helvetica-Bold").text(`TOTAL ${taxName}`, col.total, y, {
			width: col.right - col.total,
			align: "left",
		})
		doc
			.font("Helvetica")
			.text(formatRupiah(taxValue), col.total + 10, y, { align: "right" })
		y += 18
		doc.font("Helvetica-Bold").text("TOTAL", col.total, y, {
			width: col.right - col.total,
			align: "left",
		})
		doc
			.font("Helvetica-Bold")
			.text(formatRupiah(total), col.total + 10, y, { align: "right" })

		// Footer
		y -= 50
		doc.font("Helvetica").fontSize(11).text("Hormat Kami", 95, y)
		y += 60
		doc.font("Helvetica-Bold").fontSize(12).text(invoice.company_name, 70, y)

		// Tanggal pembayaran (jika ada)
		if (invoice.paid_date) {
			doc
				.font("Helvetica-Oblique")
				.fillColor("blue")
				.text(`Terbayar pada : ${formatTanggal(invoice.paid_date)}`, 50, y + 40)
			doc.fillColor("black")
		}

		doc.end()
	})
}

function formatRupiah(num) {
	return "Rp" + (num || 0).toLocaleString("id-ID")
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
