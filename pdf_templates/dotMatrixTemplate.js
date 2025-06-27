const PDFDocument = require("pdfkit")

module.exports = function (invoice) {
	return new Promise((resolve) => {
		const doc = new PDFDocument({ size: "A5", layout: "landscape", margin: 20 })
		const buffers = []

		doc.on("data", buffers.push.bind(buffers))
		doc.on("end", () => resolve(Buffer.concat(buffers)))

		// Layout & posisi
		const leftX = 60
		const rightX = 375
		const tableStartX = leftX
		const col = {
			produk: tableStartX,
			qty: tableStartX + 170,
			harga: tableStartX + 230,
			diskon: tableStartX + 300,
			pajak: tableStartX + 350,
			jumlah: tableStartX + 410,
		}
		const tableWidth = col.jumlah + 70 - tableStartX // 480

		// Header kiri (pengirim)
		const headerYOffset = 30
		doc
			.fontSize(12)
			.font("Helvetica-Bold")
			.text(invoice.company_name, leftX, 20 + headerYOffset)
		doc
			.fontSize(9)
			.font("Helvetica")
			.text(invoice.company_address || "", leftX, 38 + headerYOffset)
			.text(
				`No. Telepon: ${invoice.company_phone || "-"}`,
				leftX,
				52 + headerYOffset,
			)
			.text(
				`Rek: ${invoice.bank_account_number || "-"}\na.n ${
					invoice.bank_account_name || "-"
				} \n(${invoice.bank_name || "-"})`,
				leftX,
				66 + headerYOffset,
			)

		// Header tengah
		doc
			.fontSize(14)
			.font("Helvetica-Bold")
			.text("INVOICE", 0, 20, { align: "center" })

		// Header kanan (rapi, tidak menumpuk)
		let yHeader = 50
		doc.fontSize(9).font("Helvetica").text("Invoice No.", rightX, yHeader)
		doc
			.font("Helvetica-Bold")
			.text(invoice.invoice_number, rightX + 50, yHeader)
		yHeader += 13
		doc.font("Helvetica").text("Tanggal", rightX, yHeader)
		doc
			.font("Helvetica-Bold")
			.text(formatTanggal(invoice.invoice_date), rightX + 50, yHeader)
		yHeader += 13
		doc.font("Helvetica-Bold").text("Tagihan Kepada", rightX, yHeader + 5)
		yHeader += 13
		doc.font("Helvetica").text(invoice.recipient_name, rightX, yHeader + 5)
		let yAfter = doc.text(invoice.recipient_name, rightX, yHeader + 5, {
			width: 200,
		}).y
		yAfter = doc.text(invoice.recipient_address, rightX, yAfter + 2, {
			width: 200,
		}).y
		if (invoice.recipient_npwp) {
			yAfter = doc.text(`NPWP: ${invoice.recipient_npwp}`, rightX, yAfter + 2, {
				width: 200,
			}).y
			yHeader = yAfter + 13
		}

		// Table Header
		const tableTop = 160
		doc
			.moveTo(tableStartX, tableTop - 5)
			.lineTo(tableStartX + tableWidth, tableTop - 5)
			.lineWidth(2)
			.stroke() // garis tebal atas
		doc.font("Helvetica-Bold").fontSize(9)
		doc.text("Produk", col.produk +5, tableTop, { width: 170 })
		doc.text("Kuantitas", col.qty, tableTop, { width: 60, align: "center" })
		doc.text("Harga", col.harga, tableTop, { width: 70, align: "center" })
		doc.text("Diskon", col.diskon, tableTop, { width: 50, align: "center" })
		doc.text("Pajak", col.pajak, tableTop, { width: 60, align: "center" })
		doc.text("Jumlah", col.jumlah, tableTop, { width: 70, align: "center" })
		doc
			.moveTo(tableStartX, tableTop + 13)
			.lineTo(tableStartX + tableWidth, tableTop + 13)
			.lineWidth(2)
			.stroke() // garis tebal bawah header

		// Table Rows
		let y = tableTop + 18
		let subtotal = 0
		;(invoice.items || []).forEach((item) => {
			const itemTotal = item.qty * item.unit_price
			subtotal += itemTotal
			doc.font("Helvetica").fontSize(9)
			doc.text(item.name, col.produk + 5, y, { width: 170 })
			doc.text(item.qty, col.qty, y, { width: 60, align: "center" })
			doc.text(formatRupiah(item.unit_price), col.harga -10, y, {
				width: 70,
				align: "right",
			})
			doc.text(item.discount ? `${item.discount}%` : "0%", col.diskon, y, {
				width: 50,
				align: "center",
			})
			doc.text(
				item.tax_name ? `${item.tax_name} ${item.tax_percent || ""}%` : "-",
				col.pajak,
				y,
				{ width: 60, align: "center" },
			)
			doc.text(formatRupiah(itemTotal), col.jumlah - 5, y, {
				width: 70,
				align: "right",
			})
			// garis tipis antar item
			doc
				.moveTo(tableStartX, y + 13)
				.lineTo(tableStartX + tableWidth, y + 13)
				.lineWidth(0.5)
				.stroke() // garis tipis antar item
			y += 15
		})

		// Summary
		let taxTotal = 0
		;(invoice.taxes || []).forEach((tax) => {
			const t = (tax.percent / 100) * subtotal
			taxTotal += t
		})

		y += 10
		doc
			.font("Helvetica-Bold")
			.text("Subtotal", col.pajak, y, { width: 60, align: "center" })
		doc.text(formatRupiah(subtotal), col.jumlah - 5, y, {
			width: 70,
			align: "right",
		})
		y += 15
		;(invoice.taxes || []).forEach((tax) => {
			const t = (tax.percent / 100) * subtotal
			doc
				.font("Helvetica-Bold")
				.text(tax.name, col.pajak, y, { width: 60, align: "center" })
			doc.text(formatRupiah(t), col.jumlah - 5, y, { width: 70, align: "right" })
			y += 15
		})
		doc
			.font("Helvetica-Bold")
			.text("Total", col.pajak, y, { width: 60, align: "center" })
		doc.text(formatRupiah(subtotal + taxTotal), col.jumlah - 5, y, {
			width: 70,
			align: "right",
		})

		// garis tebal bawah summary
		doc
			.moveTo(tableStartX, y + 13)
			.lineTo(tableStartX + tableWidth, y + 13)
			.lineWidth(2)
			.stroke() // garis tebal bawah summary

		// Footer
		y += 40
		doc
			.font("Helvetica")
			.fontSize(9)
			.text("Penerima", leftX + 30, y)
		doc.text("Dibuat oleh,", rightX + 70, y)
		y += 40
		doc.text("(....................)", leftX + 20, y)
		doc.text(invoice.company_name, rightX + 50, y)
		// doc.text("Finance Dept", rightX, y + 15)

		doc.end()
	})
}

function formatRupiah(num) {
	return (
		"Rp " + (num || 0).toLocaleString("id-ID", { minimumFractionDigits: 0 })
	)
}
function formatTanggal(tgl) {
	if (!tgl) return "-"
	const d = new Date(tgl)
	return d.toLocaleDateString("id-ID")
}
