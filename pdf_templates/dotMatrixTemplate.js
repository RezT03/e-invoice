const PDFDocument = require("pdfkit")

module.exports = function (invoice) {
	return new Promise((resolve) => {
		const isQuotation = invoice.document_type === "quotation"
		const doc = new PDFDocument({
			size: "A5",
			layout: "landscape",
			// Ruang bawah disisihkan untuk footer agar konten tidak menimpanya
			margins: { top: 20, bottom: 28, left: 20, right: 20 },
			bufferPages: true // semua halaman ditampung dulu agar total halaman bisa dihitung
		})
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
		const PAGE_HEIGHT = doc.page.height
		const CONTENT_BOTTOM = PAGE_HEIGHT - 28

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

		// ======================= HEADER TABEL =======================

		function drawTableHeader(atY) {
			doc
				.moveTo(tableStartX, atY - 3)
				.lineTo(tableStartX + tableWidth, atY - 3)
				.lineWidth(1.5)
				.stroke()

			doc.font("Helvetica-Bold").fontSize(8.5).fillColor("black")
			doc.text("Deskripsi Barang / Jasa", col.produk + 4, atY, { width: 180 })
			doc.text("Qty", col.qty, atY, { width: 50, align: "center" })
			doc.text("Harga Satuan", col.harga, atY, { width: 75, align: "right" })
			doc.text("Satuan", col.satuan, atY, { width: 50, align: "center" })
			doc.text("Jumlah", col.jumlah, atY, { width: 90, align: "right" })

			doc
				.moveTo(tableStartX, atY + 14)
				.lineTo(tableStartX + tableWidth, atY + 14)
				.lineWidth(1.5)
				.stroke()

			return atY + 18
		}

		function drawCompactHeader() {
			doc.font("Helvetica-Bold").fontSize(9).fillColor("black")
			doc.text(
				`${isQuotation ? "PENAWARAN HARGA" : "INVOICE"} No. ${invoice.invoice_number}`,
				0,
				12,
				{ width: doc.page.width, align: "center" }
			)
		}

		let y = drawTableHeader(Math.max(doc.y + 15, 120))
		let subtotal = 0

		// Pindah halaman otomatis saat konten tidak muat
		function ensureSpace(neededHeight) {
			if (y + neededHeight > CONTENT_BOTTOM) {
				doc.addPage()
				y = 26
				drawCompactHeader()
				y = drawTableHeader(y)
			}
		}

		function renderItemRow(name, qty, unit, price, total) {
			ensureSpace(16)

			doc.font("Helvetica").fontSize(8).fillColor("black")
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
				ensureSpace(14)
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
				ensureSpace(14)
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

		function drawSummaryRow(label, value, labelX, labelWidth, bold = false) {
			ensureSpace(14)
			doc.font(bold ? "Helvetica-Bold" : "Helvetica")
				.fontSize(bold ? 9 : 8.5)
				.fillColor("black")
			doc.text(label, labelX, y, { width: labelWidth, align: "right" })
			doc.text(value, col.jumlah, y, { width: 90, align: "right" })
			y += 13
		}

		drawSummaryRow("Subtotal:", formatRupiah(subtotal), col.satuan - 20, 70)

		const discount = invoice.discount_value || 0
		if (discount > 0) {
			drawSummaryRow("Diskon:", `-${formatRupiah(discount)}`, col.satuan - 20, 70)
		}

		;(invoice.taxes || []).forEach((tax) => {
			const t = tax.amount !== undefined ? tax.amount : ((subtotal - discount) * (tax.percentage || 0)) / 100
			drawSummaryRow(`${tax.name} (${tax.percentage}%):`, formatRupiah(t), col.satuan - 40, 90)
		})

		drawSummaryRow(
			"Total:",
			formatRupiah(invoice.total_amount || subtotal),
			col.satuan - 20,
			70,
			true
		)

		doc
			.moveTo(tableStartX, y + 1)
			.lineTo(tableStartX + tableWidth, y + 1)
			.lineWidth(1.5)
			.stroke()

		// Footer tanda tangan
		y += 25
		ensureSpace(45)
		doc.font("Helvetica").fontSize(8.5).fillColor("black")
		doc.text("Penerima,", leftX + 30, y)
		doc.text("Hormat Kami,", rightX + 40, y)
		y += 35
		doc.text("( ......................... )", leftX + 15, y)
		doc.font("Helvetica-Bold").text(invoice.company_name, rightX + 20, y)

		// ======================= FOOTER HALAMAN =======================
		// Digambar terakhir agar "Halaman n/n" mengikuti jumlah halaman aktual.

		const range = doc.bufferedPageRange()
		for (let i = range.start; i < range.start + range.count; i++) {
			doc.switchToPage(i)

			// Footer digambar di area margin, jadi sesuaikan batas bawah
			// sementara agar PDFKit tidak membuat halaman baru.
			const bottomMargin = doc.page.margins.bottom
			doc.page.margins.bottom = 0

			const pageNumber = i - range.start + 1
			doc.font("Helvetica").fontSize(8).fillColor("#666666")
			doc.text(`Halaman ${pageNumber}/${range.count}`, tableStartX, PAGE_HEIGHT - 14, {
				width: tableWidth,
				align: "right",
			})
			doc
				.moveTo(tableStartX, PAGE_HEIGHT - 20)
				.lineTo(tableStartX + tableWidth, PAGE_HEIGHT - 20)
				.lineWidth(0.5)
				.stroke("#cccccc")

			doc.page.margins.bottom = bottomMargin
		}

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
