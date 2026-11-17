const PDFDocument = require("pdfkit")
const path = require("path")
const fs = require("fs")
const { generateInvoiceQRCode } = require("../utils/qrCodeGenerator")

// Brand colors
const COLOR_PRIMARY = "#0356fc"
const COLOR_SECONDARY = "#fc032d"
const COLOR_TEXT = "#1a1f36"
const COLOR_MUTED = "#6b7280"
const COLOR_BORDER = "#e5e7eb"
const COLOR_BG = "#f4f6fb"
const COLOR_GROUP_HEADER = "#0356fc"
const COLOR_GROUP_SUBTOTAL = "#e8f0ff"

module.exports = async function (invoice) {
	return new Promise(async (resolve, reject) => {
		try {
			const isQuotation = invoice.document_type === "quotation"

			// Logo path
			let logoFile = null
			if (invoice.logo_path) logoFile = path.basename(invoice.logo_path)
			if (!invoice.ttd) invoice.ttd = "respro_ttd.png"

			const doc = new PDFDocument({
				size: "A4",
				margin: 50,
				bufferPages: true, // penting untuk multipage
			})

			const buffers = []
			doc.on("data", buffers.push.bind(buffers))
			doc.on("end", () => resolve(Buffer.concat(buffers)))

			// A4 dimensions
			const PAGE_WIDTH = doc.page.width   // 595
			const PAGE_HEIGHT = doc.page.height // 842
			const MARGIN = 50
			const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2 // 495

			// Column widths for items table
			const col = {
				no:    { x: MARGIN,      w: 25 },
				desc:  { x: MARGIN + 25, w: 195 },
				qty:   { x: MARGIN + 220, w: 40 },
				unit:  { x: MARGIN + 260, w: 55 },
				price: { x: MARGIN + 315, w: 90 },
				total: { x: MARGIN + 405, w: 90 },
			}

			// Track current page number
			let pageNumber = 1
			let isFirstPage = true

			// ======================= HELPERS =======================

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

			function calculateSubtotal(items) {
				let total = 0
				for (const item of items || []) {
					if (item.is_group) {
						for (const sub of item.items || []) {
							total += (sub.quantity || sub.qty || 0) * (sub.price || sub.unit_price || 0)
						}
					} else {
						total += (item.quantity || item.qty || 0) * (item.price || item.unit_price || 0)
					}
				}
				return total
			}

			// Draw thin horizontal rule
			function drawRule(y, color = COLOR_BORDER, width = 1) {
				doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_WIDTH, y).lineWidth(width).stroke(color)
			}

			// ======================= PAGE HEADER (compact, appears on every page except first) =======================

			function drawPageHeader() {
				// Minimal repeat header on page 2+
				if (!isFirstPage) {
					doc.fontSize(8).font("Helvetica").fillColor(COLOR_MUTED)
					doc.text(
						`${isQuotation ? "PENAWARAN HARGA" : "INVOICE"} No. ${invoice.invoice_number}  —  ${invoice.company_name}`,
						MARGIN,
						MARGIN - 20,
						{ width: CONTENT_WIDTH, align: "center" }
					)
					drawRule(MARGIN - 5, COLOR_BORDER, 0.5)
				}
			}

			// ======================= FOOTER (page number) =======================

			function drawPageFooter() {
				const footerY = PAGE_HEIGHT - 35
				doc.fontSize(8).font("Helvetica").fillColor(COLOR_MUTED)
				doc.text(`Halaman ${pageNumber}`, MARGIN, footerY, { width: CONTENT_WIDTH, align: "right" })
				drawRule(footerY - 8, COLOR_BORDER, 0.5)
			}

			// ======================= CHECK & NEW PAGE =======================

			// Returns true if we just added a new page
			function checkNewPage(neededHeight, currentY) {
				const footerReserve = 50
				if (currentY + neededHeight > PAGE_HEIGHT - footerReserve) {
					drawPageFooter()
					doc.addPage()
					pageNumber++
					isFirstPage = false
					drawPageHeader()
					return MARGIN + 15
				}
				return currentY
			}

			// ======================= DRAW TABLE ROW =======================

			function drawTableRow(y, cells, options = {}) {
				const {
					isHeader = false,
					isGroupHeader = false,
					isGroupSubtotal = false,
					isGrandTotal = false,
					zebra = false,
					rowHeight = 22,
				} = options

				// Background
				if (isHeader) {
					doc.rect(MARGIN, y, CONTENT_WIDTH, rowHeight).fill("#eeeeee")
				} else if (isGroupHeader) {
					doc.rect(MARGIN, y, CONTENT_WIDTH, rowHeight).fill(COLOR_GROUP_HEADER)
				} else if (isGroupSubtotal) {
					doc.rect(MARGIN, y, CONTENT_WIDTH, rowHeight).fill(COLOR_GROUP_SUBTOTAL)
				} else if (isGrandTotal) {
					doc.rect(MARGIN, y, CONTENT_WIDTH, rowHeight).fill("#f4f6fb")
				} else if (zebra) {
					doc.rect(MARGIN, y, CONTENT_WIDTH, rowHeight).fill("#fafafa")
				}

				// Text color
				let textColor = COLOR_TEXT
				if (isHeader) textColor = COLOR_TEXT
				if (isGroupHeader) textColor = "#ffffff"
				if (isGroupSubtotal) textColor = COLOR_PRIMARY
				if (isGrandTotal) textColor = COLOR_PRIMARY

				doc.fillColor(textColor)

				const fontSize = isHeader || isGroupHeader || isGrandTotal ? 8.5 : 8
				const fontName =
					isHeader || isGroupHeader || isGrandTotal || isGroupSubtotal
						? "Helvetica-Bold"
						: "Helvetica"

				doc.fontSize(fontSize).font(fontName)

				const textY = y + (rowHeight - fontSize) / 2 + 1

				// Draw each cell
				cells.forEach(({ x, w, text, align = "left" }) => {
					if (text !== undefined && text !== null) {
						doc.text(String(text), x + 2, textY, { width: w - 4, align })
					}
				})

				// Bottom border
				if (!isGroupHeader) {
					doc.moveTo(MARGIN, y + rowHeight).lineTo(MARGIN + CONTENT_WIDTH, y + rowHeight)
						.lineWidth(0.3).stroke("#dddddd")
				}

				return y + rowHeight
			}

			// ======================= FIRST PAGE HEADER =======================

			let y = MARGIN

			// Logo
			let logoWidth = 120
			if (invoice.company_name === "Restu Production") logoWidth = 150
			else if (invoice.company_name === "CV Lingkar Utara Gemilang") logoWidth = 90

			if (logoFile) {
				const logoPath = path.join(__dirname, "../public/img", logoFile)
				if (fs.existsSync(logoPath)) {
					doc.image(logoPath, MARGIN, y, { width: logoWidth })
				}
			}

			// Document type label (top right)
			const docLabel = isQuotation ? "PENAWARAN HARGA" : "INVOICE"
			doc.fontSize(20).font("Helvetica-Bold").fillColor(isQuotation ? "#d97706" : COLOR_PRIMARY)
			doc.text(docLabel, MARGIN, y, { width: CONTENT_WIDTH, align: "right" })

			y += 28

			// Invoice number (right)
			doc.fontSize(10).font("Helvetica-Bold").fillColor(COLOR_TEXT)
			doc.text(invoice.invoice_number, MARGIN, y, { width: CONTENT_WIDTH, align: "right" })

			y += 16

			// Date meta (right)
			doc.fontSize(8).font("Helvetica").fillColor(COLOR_MUTED)
			const dateStr = `Tanggal: ${formatTanggal(invoice.invoice_date)}`
			doc.text(dateStr, MARGIN, y, { width: CONTENT_WIDTH, align: "right" })
			y += 11

			if (invoice.due_date) {
				const dueLabel = isQuotation ? "Berlaku s/d:" : "Jatuh Tempo:"
				doc.text(`${dueLabel} ${formatTanggal(invoice.due_date)}`, MARGIN, y, {
					width: CONTENT_WIDTH,
					align: "right",
				})
				y += 11
			}

			// Company info (left)
			const companyTextY = logoFile ? MARGIN + logoWidth * 0.55 : MARGIN
			doc.fontSize(11).font("Helvetica-Bold").fillColor(COLOR_TEXT)
			doc.text(invoice.company_name, MARGIN, companyTextY)
			doc.fontSize(8).font("Helvetica").fillColor(COLOR_MUTED)
			if (invoice.company_address) {
				doc.text(invoice.company_address, MARGIN, doc.y, { width: 260 })
			}
			if (invoice.company_phone) {
				doc.text(invoice.company_phone, MARGIN, doc.y)
			}

			// Ensure y is below the company info block
			y = Math.max(y, doc.y + 10)

			// Divider line
			y += 10
			drawRule(y, COLOR_PRIMARY, 1.5)
			y += 15

			// Recipient section
			doc.fontSize(8).font("Helvetica-Bold").fillColor(COLOR_MUTED).text("KEPADA:", MARGIN, y)
			y += 12
			doc.fontSize(10).font("Helvetica-Bold").fillColor(COLOR_TEXT)
			doc.text(invoice.recipient_name, MARGIN, y)
			y += 14

			doc.fontSize(8).font("Helvetica").fillColor(COLOR_MUTED)
			if (invoice.recipient_phone) {
				doc.text(`Tel: ${invoice.recipient_phone}`, MARGIN, y)
				y += 11
			}
			if (invoice.recipient_npwp) {
				doc.text(`NPWP: ${invoice.recipient_npwp}`, MARGIN, y)
				y += 11
			}
			if (invoice.recipient_address) {
				doc.text(invoice.recipient_address, MARGIN, y, { width: 300 })
				y = doc.y + 5
			}

			y += 15

			// ======================= ITEMS TABLE =======================

			// Table header
			y = checkNewPage(30, y)
			y = drawTableRow(y, [
				{ x: col.no.x,    w: col.no.w,    text: "No",       align: "center" },
				{ x: col.desc.x,  w: col.desc.w,  text: "DESKRIPSI BARANG/JASA" },
				{ x: col.qty.x,   w: col.qty.w,   text: "QTY",      align: "center" },
				{ x: col.unit.x,  w: col.unit.w,  text: "SATUAN",   align: "center" },
				{ x: col.price.x, w: col.price.w, text: "HARGA SATUAN", align: "right" },
				{ x: col.total.x, w: col.total.w, text: "TOTAL",    align: "right" },
			], { isHeader: true, rowHeight: 24 })

			// Render items (supports both grouped and flat)
			const items = invoice.items || []
			let globalRowIndex = 0
			const grandSubtotal = calculateSubtotal(items)

			for (const item of items) {
				if (item.is_group) {
					// Group header row
					y = checkNewPage(24, y)
					y = drawTableRow(y, [
						{ x: col.no.x, w: CONTENT_WIDTH, text: `  ${item.group_name || ""}`, align: "left" },
					], { isGroupHeader: true, rowHeight: 20 })

					// Group items
					let groupSubtotal = 0
					const groupItems = item.items || []

					for (let i = 0; i < groupItems.length; i++) {
						const sub = groupItems[i]
						const desc = sub.description || sub.name || ""
						const descHeight = doc.heightOfString(desc, { width: col.desc.w - 4, fontSize: 8 })
						const rh = Math.max(descHeight + 10, 20)

						y = checkNewPage(rh, y)

						globalRowIndex++
						const lineTotal = (sub.quantity || sub.qty || 0) * (sub.price || sub.unit_price || 0)
						groupSubtotal += lineTotal

						y = drawTableRow(y, [
							{ x: col.no.x,    w: col.no.w,    text: globalRowIndex, align: "center" },
							{ x: col.desc.x,  w: col.desc.w,  text: desc },
							{ x: col.qty.x,   w: col.qty.w,   text: sub.quantity || sub.qty || 0, align: "center" },
							{ x: col.unit.x,  w: col.unit.w,  text: sub.unit || "-", align: "center" },
							{ x: col.price.x, w: col.price.w, text: formatRupiah(sub.price || sub.unit_price || 0), align: "right" },
							{ x: col.total.x, w: col.total.w, text: formatRupiah(lineTotal), align: "right" },
						], { zebra: i % 2 === 1, rowHeight: rh })
					}

					// Group subtotal row
					y = checkNewPage(20, y)
					y = drawTableRow(y, [
						{ x: col.no.x,    w: col.no.w + col.desc.w + col.qty.w + col.unit.w + col.price.w,
						  text: `Subtotal ${item.group_name || ""}`, align: "right" },
						{ x: col.total.x, w: col.total.w, text: formatRupiah(groupSubtotal), align: "right" },
					], { isGroupSubtotal: true, rowHeight: 20 })

				} else {
					// Flat item
					const desc = item.description || item.name || ""
					const descHeight = doc.heightOfString(desc, { width: col.desc.w - 4, fontSize: 8 })
					const rh = Math.max(descHeight + 10, 20)

					y = checkNewPage(rh, y)

					globalRowIndex++
					const lineTotal = (item.quantity || item.qty || 0) * (item.price || item.unit_price || 0)

					y = drawTableRow(y, [
						{ x: col.no.x,    w: col.no.w,    text: globalRowIndex, align: "center" },
						{ x: col.desc.x,  w: col.desc.w,  text: desc },
						{ x: col.qty.x,   w: col.qty.w,   text: item.quantity || item.qty || 0, align: "center" },
						{ x: col.unit.x,  w: col.unit.w,  text: item.unit || "-", align: "center" },
						{ x: col.price.x, w: col.price.w, text: formatRupiah(item.price || item.unit_price || 0), align: "right" },
						{ x: col.total.x, w: col.total.w, text: formatRupiah(lineTotal), align: "right" },
					], { zebra: globalRowIndex % 2 === 0, rowHeight: rh })
				}
			}

			// ======================= SUMMARY SECTION =======================

			y += 8

			const summaryLabelX = MARGIN + 310
			const summaryValueX = MARGIN + 405
			const summaryW = 90

			function drawSummaryLine(label, value, isBold = false, color = COLOR_TEXT) {
				y = checkNewPage(18, y)
				doc.fontSize(8.5)
					.font(isBold ? "Helvetica-Bold" : "Helvetica")
					.fillColor(COLOR_MUTED)
					.text(label, summaryLabelX, y, { width: summaryW, align: "right" })
				doc.fillColor(color)
					.text(value, summaryValueX, y, { width: summaryW, align: "right" })
				y += 15
			}

			// Subtotal
			drawSummaryLine("Subtotal:", formatRupiah(grandSubtotal))

			// Discount
			const discountVal = invoice.discount_value || 0
			if (discountVal > 0) {
				drawSummaryLine("Diskon:", `− ${formatRupiah(discountVal)}`, false, "#15803d")
			}

			// Taxes
			const afterDiscount = grandSubtotal - discountVal;
			(invoice.taxes || []).forEach((tax) => {
				const taxAmount = tax.amount !== undefined
					? tax.amount
					: (afterDiscount * (tax.percentage || 0)) / 100
				drawSummaryLine(`${tax.name} (${tax.percentage}%):`, formatRupiah(taxAmount))
			})

			// Grand total line
			y = checkNewPage(28, y)
			drawRule(y, COLOR_BORDER, 0.5)
			y += 5
			doc.fontSize(10).font("Helvetica-Bold").fillColor(COLOR_MUTED)
				.text("TOTAL:", summaryLabelX, y, { width: summaryW, align: "right" })
			doc.fillColor(COLOR_PRIMARY)
				.text(formatRupiah(invoice.total_amount || 0), summaryValueX, y, { width: summaryW, align: "right" })
			y += 20

			// ======================= FOOTER SECTION (Tanda Tangan & QR) =======================

			// Always keep signature on last page
			const signatureHeight = 120
			y = checkNewPage(signatureHeight, y)
			y += 15

			// Left: "Hormat Kami" + QR / TTD
			doc.fontSize(9).font("Helvetica").fillColor(COLOR_TEXT).text("Hormat Kami,", MARGIN, y)

			try {
				const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`
				const qrBuffer = await generateInvoiceQRCode(invoice.share_token, baseUrl)
				doc.image(qrBuffer, MARGIN, y + 12, { width: 72 })
			} catch (e) {
				const ttdPath = path.join(__dirname, "../public/", invoice.ttd)
				if (fs.existsSync(ttdPath)) {
					doc.image(ttdPath, MARGIN, y + 12, { width: 65 })
				}
			}

			doc.fontSize(9).font("Helvetica-Bold").fillColor(COLOR_TEXT)
				.text(invoice.company_name, MARGIN, y + 92)

			// Paid stamp
			if (invoice.paid_date) {
				const stampX = MARGIN + CONTENT_WIDTH / 2 - 40
				doc.fontSize(16).font("Helvetica-Bold").fillColor("#22c55e")
					.text("LUNAS", stampX, y + 20)
				doc.fontSize(8).font("Helvetica-Oblique").fillColor(COLOR_MUTED)
					.text(formatTanggal(invoice.paid_date), stampX, y + 38)
			}

			// Bank info (right side of footer, only for invoice)
			if (!isQuotation && invoice.bank_name) {
				const bankX = MARGIN + CONTENT_WIDTH / 2 + 20
				doc.fontSize(8).font("Helvetica-Bold").fillColor(COLOR_TEXT).text("Informasi Pembayaran:", bankX, y)
				y += 12
				doc.font("Helvetica").fillColor(COLOR_MUTED)
				doc.text(`Bank: ${invoice.bank_name}`, bankX, y)
				y += 11
				doc.text(`No. Rek: ${invoice.bank_account_number}`, bankX, y)
				y += 11
				doc.text(`A/N: ${invoice.bank_account_name}`, bankX, y)
			}

			// Draw footer on last page
			drawPageFooter()

			doc.end()
		} catch (error) {
			console.error("PDF Generate Error:", error)
			reject(error)
		}
	})
}
