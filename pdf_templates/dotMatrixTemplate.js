const PDFDocument = require("pdfkit")

module.exports = function (invoice) {
	return new Promise((resolve) => {
		const isQuotation = invoice.document_type === "quotation"
		const doc = new PDFDocument({ size: "A5", layout: "landscape", margin: 20 })
		const buffers = []

		doc.on("data", buffers.push.bind(buffers))
		doc.on("end", () => resolve(Buffer.concat(buffers)))

		// Layout & posisi
		const leftX = 50
		const rightX = 350
		const tableStartX = leftX
		const col = {
			produk: tableStartX,
			qty: tableStartX + 190,
			harga: tableStartX + 250,
			satuan: tableStartX + 330,
			jumlah: tableStartX + 390,
		}
		const tableWidth = col.jumlah + 100 - tableStartX // 490

		// Header kiri (pengirim)
		const headerYOffset = 25
		doc
			.fontSize(11)
			.font("Helvetica-Bold")
			.text(invoice.company_name, leftX, headerYOffset)
		doc
			.fontSize(8.5)
			.font("Helvetica")
			.text(invoice.company_address || "", leftX, headerYOffset + 16, { width: 220 })
			.text(`Tel: ${invoice.company_phone || "-"}`, leftX, doc.y + 2)

		if (!isQuotation && invoice.bank_name) {
			doc.text(
				`Bank: ${invoice.bank_name} | Rek: ${invoice.bank_account_number || "-"} a.n ${invoice.bank_account_name || "-"}`,
				leftX,
				doc.y + 2,
				{ width: 260 }
			)
		}

		// Header tengah
		doc
			.fontSize(13)
			.font("Helvetica-Bold")
			.text(isQuotation ? "PENAWARAN HARGA" : "INVOICE", 0, 15, { align: "center" })

		// Header kanan
		let yHeader = 35
		doc.fontSize(8.5).font("Helvetica").text("No. Dokumen:", rightX, yHeader)
		doc.font("Helvetica-Bold").text(invoice.invoice_number, rightX + 65, yHeader)
		yHeader += 13
		doc.font("Helvetica").text("Tanggal:", rightX, yHeader)
		doc.font("Helvetica-Bold").text(formatTanggal(invoice.invoice_date), rightX + 65, yHeader)
		yHeader += 13

		if (invoice.due_date) {
			doc.font("Helvetica").text(isQuotation ? "Berlaku s/d:" : "Jatuh Tempo:", rightX, yHeader)
			doc.font("Helvetica-Bold").text(formatTanggal(invoice.due_date), rightX + 65, yHeader)
			yHeader += 13
		}

		doc.font("Helvetica-Bold").text("Kepada:", rightX, yHeader)
		doc.font("Helvetica").text(invoice.recipient_name, rightX + 45, yHeader)
		if (invoice.recipient_phone) {
			yHeader += 11
			doc.text(`Tel: ${invoice.recipient_phone}`, rightX + 45, yHeader)
		}

		// Table Header
		const tableTop = Math.max(doc.y + 15, 120)
		doc
			.moveTo(tableStartX, tableTop - 3)
			.lineTo(tableStartX + tableWidth, tableTop - 3)
			.lineWidth(1.5)
			.stroke()

		doc.font("Helvetica-Bold").fontSize(8.5)
		doc.text("Deskripsi Barang / Jasa", col.produk + 4, tableTop, { width: 180 })
		doc.text("Qty", col.qty, tableTop, { width: 50, align: "center" })
		doc.text("Harga Satuan", col.harga, tableTop, { width: 75, align: "right" })
		doc.text("Satuan", col.satuan, tableTop, { width: 50, align: "center" })
		doc.text("Jumlah", col.jumlah, tableTop, { width: 90, align: "right" })

		doc
			.moveTo(tableStartX, tableTop + 14)
			.lineTo(tableStartX + tableWidth, tableTop + 14)
			.lineWidth(1.5)
			.stroke()

		// Table Rows
		let y = tableTop + 18
		let subtotal = 0

		function renderItemRow(name, qty, unit, price, total) {
			doc.font("Helvetica").fontSize(8)
			doc.text(name, col.produk + 4, y, { width: 180 })
			doc.text(String(qty), col.qty, y, { width: 50, align: "center" })
			doc.text(formatRupiah(price), col.harga, y, { width: 75, align: "right" })
			doc.text(unit || "-", col.satuan, y, { width: 50, align: "center" })
			doc.text(formatRupiah(total), col.jumlah, y, { width: 90, align: "right" })

			doc
				.moveTo(tableStartX, y + 12)
				.lineTo(tableStartX + tableWidth, y + 12)
				.lineWidth(0.4)
				.stroke("#ccc")
			y += 14
		}

		;(invoice.items || []).forEach((item) => {
			if (item.is_group) {
				// Group header line
				doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#0356fc")
				doc.text(`[ ${item.group_name || "Grup"} ]`, col.produk + 4, y)
				doc.fillColor("black")
				y += 12

				let grpSub = 0
				;(item.items || []).forEach((sub) => {
					const q = sub.quantity || sub.qty || 0
					const p = sub.price || sub.unit_price || 0
					const t = q * p
					grpSub += t
					subtotal += t
					renderItemRow(sub.description || sub.name || "", q, sub.unit, p, t)
				})

				// Subtotal group line
				doc.font("Helvetica-Bold").fontSize(7.5).fillColor("#666")
				doc.text(`Subtotal ${item.group_name}: ${formatRupiah(grpSub)}`, col.produk + 4, y, {
					width: tableWidth,
					align: "right",
				})
				doc.fillColor("black")
				y += 12
			} else {
				const q = item.quantity || item.qty || 0
				const p = item.price || item.unit_price || 0
				const t = q * p
				subtotal += t
				renderItemRow(item.description || item.name || "", q, item.unit, p, t)
			}
		})

		// Summary
		y += 6
		doc.font("Helvetica").fontSize(8.5)
		doc.text("Subtotal:", col.satuan - 20, y, { width: 70, align: "right" })
		doc.text(formatRupiah(subtotal), col.jumlah, y, { width: 90, align: "right" })
		y += 13

		const discount = invoice.discount_value || 0
		if (discount > 0) {
			doc.text("Diskon:", col.satuan - 20, y, { width: 70, align: "right" })
			doc.text(`-${formatRupiah(discount)}`, col.jumlah, y, { width: 90, align: "right" })
			y += 13
		}

		;(invoice.taxes || []).forEach((tax) => {
			const t = tax.amount !== undefined ? tax.amount : ((subtotal - discount) * (tax.percentage || 0)) / 100
			doc.text(`${tax.name} (${tax.percentage}%):`, col.satuan - 40, y, { width: 90, align: "right" })
			doc.text(formatRupiah(t), col.jumlah, y, { width: 90, align: "right" })
			y += 13
		})

		doc.font("Helvetica-Bold").fontSize(9)
		doc.text("Total:", col.satuan - 20, y, { width: 70, align: "right" })
		doc.text(formatRupiah(invoice.total_amount || subtotal), col.jumlah, y, { width: 90, align: "right" })

		doc
			.moveTo(tableStartX, y + 14)
			.lineTo(tableStartX + tableWidth, y + 14)
			.lineWidth(1.5)
			.stroke()

		// Footer tanda tangan
		y += 25
		if (y > 360) {
			doc.addPage()
			y = 30
		}
		doc.font("Helvetica").fontSize(8.5).text("Penerima,", leftX + 30, y)
		doc.text("Hormat Kami,", rightX + 40, y)
		y += 35
		doc.text("( ......................... )", leftX + 15, y)
		doc.font("Helvetica-Bold").text(invoice.company_name, rightX + 20, y)

		doc.end()
	})
}

function formatRupiah(num) {
	return "Rp " + Math.round(num || 0).toLocaleString("id-ID")
}

function formatTanggal(tgl) {
	if (!tgl) return "-"
	return new Date(tgl).toLocaleDateString("id-ID")
}
