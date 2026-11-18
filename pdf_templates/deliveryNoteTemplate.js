const PDFDocument = require("pdfkit")
const path = require("path")
const fs = require("fs")

// Brand colors
const COLOR_PRIMARY = "#0356fc"
const COLOR_TEXT = "#1a1f36"
const COLOR_MUTED = "#6b7280"
const COLOR_BORDER = "#e5e7eb"

module.exports = function generateDeliveryNotePDF(delivery) {
	return new Promise((resolve, reject) => {
		try {
			// Logo
			let logoFile = null
			if (delivery.logo_path) logoFile = path.basename(delivery.logo_path)

			const doc = new PDFDocument({
				size: "A4",
				margins: { top: 50, bottom: 60, left: 50, right: 50 },
				bufferPages: true, // semua halaman ditampung dulu agar nomor halaman akurat
			})

			const buffers = []
			doc.on("data", buffers.push.bind(buffers))
			doc.on("end", () => resolve(Buffer.concat(buffers)))

			// A4 dimensions
			const PAGE_WIDTH = doc.page.width // 595
			const PAGE_HEIGHT = doc.page.height // 842
			const MARGIN = 50
			const BOTTOM_MARGIN = 60
			const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2 // 495
			const CONTENT_BOTTOM = PAGE_HEIGHT - BOTTOM_MARGIN // 782

			// Column widths for items table
			const col = {
				no: { x: MARGIN, w: 24 },
				desc: { x: MARGIN + 24, w: 150 },
				out: { x: MARGIN + 174, w: 45 },
				in: { x: MARGIN + 219, w: 45 },
				condOut: { x: MARGIN + 264, w: 75 },
				condIn: { x: MARGIN + 339, w: 75 },
				notes: { x: MARGIN + 414, w: 81 },
			}

			// ======================= HELPERS =======================

			function formatTanggal(tgl) {
				if (!tgl) return "-"
				return new Date(tgl).toLocaleDateString("id-ID", {
					day: "2-digit",
					month: "long",
					year: "numeric",
				})
			}

			function drawRule(y, color = COLOR_BORDER, width = 1) {
				doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_WIDTH, y).lineWidth(width).stroke(color)
			}

			function drawCompactHeader() {
				doc.fontSize(8).font("Helvetica").fillColor(COLOR_MUTED)
				doc.text(
					`SURAT JALAN No. ${delivery.delivery_number}  —  ${delivery.company_name || ""}`,
					MARGIN,
					MARGIN - 20,
					{ width: CONTENT_WIDTH, align: "center" },
				)
				drawRule(MARGIN - 5, COLOR_BORDER, 0.5)
			}

			function drawPageFooter(pageNumber, totalPages) {
				const footerY = PAGE_HEIGHT - 35
				doc.fontSize(8).font("Helvetica").fillColor(COLOR_MUTED)
				doc.text(`Halaman ${pageNumber}/${totalPages}`, MARGIN, footerY, {
					width: CONTENT_WIDTH,
					align: "right",
				})
				drawRule(footerY - 8, COLOR_BORDER, 0.5)
			}

			function finalizePages() {
				const range = doc.bufferedPageRange()
				for (let i = range.start; i < range.start + range.count; i++) {
					doc.switchToPage(i)
					const bottomMargin = doc.page.margins.bottom
					doc.page.margins.bottom = 0

					const pageNumber = i - range.start + 1
					if (pageNumber > 1) drawCompactHeader()
					drawPageFooter(pageNumber, range.count)

					doc.page.margins.bottom = bottomMargin
				}
			}

			function drawTableRow(y, cells, options = {}) {
				const {
					isHeader = false,
					zebra = false,
					rowHeight = 22,
				} = options

				if (isHeader) {
					doc.rect(MARGIN, y, CONTENT_WIDTH, rowHeight).fill("#eeeeee")
				} else if (zebra) {
					doc.rect(MARGIN, y, CONTENT_WIDTH, rowHeight).fill("#fafafa")
				}

				const textColor = COLOR_TEXT
				doc.fillColor(textColor)
				const fontSize = isHeader ? 8.5 : 8
				const fontName = isHeader ? "Helvetica-Bold" : "Helvetica"
				doc.fontSize(fontSize).font(fontName)

				const textY = y + (rowHeight - fontSize) / 2 + 1

				cells.forEach(({ x, w, text, align = "left" }) => {
					if (text !== undefined && text !== null) {
						doc.text(String(text), x + 2, textY, { width: w - 4, align })
					}
				})

				doc
					.moveTo(MARGIN, y + rowHeight)
					.lineTo(MARGIN + CONTENT_WIDTH, y + rowHeight)
					.lineWidth(0.3)
					.stroke("#dddddd")

				return y + rowHeight
			}

			function drawTableHeader(atY) {
				return drawTableRow(
					atY,
					[
						{ x: col.no.x, w: col.no.w, text: "No", align: "center" },
						{ x: col.desc.x, w: col.desc.w, text: "NAMA BARANG / DESKRIPSI" },
						{ x: col.out.x, w: col.out.w, text: "KELUAR", align: "center" },
						{ x: col.in.x, w: col.in.w, text: "KEMBALI", align: "center" },
						{ x: col.condOut.x, w: col.condOut.w, text: "KONDISI KELUAR", align: "center" },
						{ x: col.condIn.x, w: col.condIn.w, text: "KONDISI KEMBALI", align: "center" },
						{ x: col.notes.x, w: col.notes.w, text: "CATATAN", align: "center" },
					],
					{ isHeader: true, rowHeight: 26 },
				)
			}

			function ensureSpace(neededHeight, currentY) {
				if (currentY + neededHeight > CONTENT_BOTTOM) {
					doc.addPage()
					let ny = MARGIN + 8
					ny = drawTableHeader(ny)
					return ny
				}
				return currentY
			}

			// ======================= FIRST PAGE HEADER =======================

			let y = MARGIN

			// Logo (opsional)
			let logoWidth = 120
			if (delivery.company_name === "Restu Production") logoWidth = 150
			else if (delivery.company_name === "CV Lingkar Utara Gemilang") logoWidth = 90

			let logoDrawn = false
			if (logoFile) {
				const logoPath = path.join(__dirname, "../public/img", logoFile)
				if (fs.existsSync(logoPath)) {
					doc.image(logoPath, MARGIN, y, { width: logoWidth })
					logoDrawn = true
				}
			}

			// Judul dokumen (kanan atas)
			doc.fontSize(20).font("Helvetica-Bold").fillColor(COLOR_PRIMARY)
			doc.text("SURAT JALAN", MARGIN, y, { width: CONTENT_WIDTH, align: "right" })

			y += 28
			doc.fontSize(10).font("Helvetica-Bold").fillColor(COLOR_TEXT)
			doc.text(delivery.delivery_number, MARGIN, y, { width: CONTENT_WIDTH, align: "right" })

			y += 15
			doc.fontSize(8).font("Helvetica").fillColor(COLOR_MUTED)
			doc.text(`Tanggal: ${formatTanggal(delivery.delivery_date)}`, MARGIN, y, {
				width: CONTENT_WIDTH,
				align: "right",
			})

			if (delivery.return_date) {
				y += 11
				doc.text(`Perkiraan Kembali: ${formatTanggal(delivery.return_date)}`, MARGIN, y, {
					width: CONTENT_WIDTH,
					align: "right",
				})
			}

			// Info perusahaan (kiri)
			const companyTextY = logoDrawn ? MARGIN + logoWidth * 0.55 : MARGIN
			doc.fontSize(11).font("Helvetica-Bold").fillColor(COLOR_TEXT)
			doc.text(delivery.company_name || "-", MARGIN, companyTextY)
			doc.fontSize(8).font("Helvetica").fillColor(COLOR_MUTED)
			if (delivery.company_address) {
				doc.text(delivery.company_address, MARGIN, doc.y, { width: 260 })
			}
			if (delivery.company_phone) {
				doc.text(delivery.company_phone, MARGIN, doc.y)
			}

			y = Math.max(y, doc.y + 10)

			// Garis pemisah
			y += 10
			drawRule(y, COLOR_PRIMARY, 1.5)
			y += 15

			// ======================= INFO BLOCK =======================

			const rightColX = MARGIN + 300
			const rightColW = CONTENT_WIDTH - 300
			const infoStartY = y

			// Kiri: KEPADA
			doc.fontSize(8).font("Helvetica-Bold").fillColor(COLOR_MUTED).text("KEPADA:", MARGIN, y)
			doc.fontSize(10).font("Helvetica-Bold").fillColor(COLOR_TEXT)
			doc.text(delivery.recipient_name || "-", MARGIN, y + 12)
			let leftY = y + 26
			doc.fontSize(8).font("Helvetica").fillColor(COLOR_MUTED)
			if (delivery.recipient_phone) {
				doc.text(`Tel: ${delivery.recipient_phone}`, MARGIN, leftY)
				leftY += 11
			}
			if (delivery.recipient_address) {
				doc.text(delivery.recipient_address, MARGIN, leftY, { width: 270 })
				leftY = doc.y + 3
			}

			// Kanan: detail pengiriman
			let ry = infoStartY
			function infoLine(label, value) {
				if (!value) return
				doc.fontSize(8).font("Helvetica-Bold").fillColor(COLOR_MUTED).text(label, rightColX, ry, { width: 80 })
				doc.fontSize(8).font("Helvetica").fillColor(COLOR_TEXT).text(String(value), rightColX + 85, ry, {
					width: rightColW - 85,
				})
				ry += 12
			}
			infoLine("Referensi", delivery.booking_number || "-")
			if (delivery.booking_title) infoLine("Event", delivery.booking_title)
			infoLine("Driver", delivery.driver_name || "-")
			infoLine("Kendaraan", delivery.vehicle_number || "-")
			infoLine("Tgl. Kirim", formatTanggal(delivery.delivery_date))
			infoLine("Tgl. Kembali", delivery.return_date ? formatTanggal(delivery.return_date) : "-")

			y = Math.max(leftY, ry) + 15

			// ======================= ITEMS TABLE =======================

			y = ensureSpace(30, y)
			y = drawTableHeader(y)

			const items = Array.isArray(delivery.items) ? delivery.items : []

			if (items.length === 0) {
				y = ensureSpace(22, y)
				y = drawTableRow(
					y,
					[{ x: col.no.x, w: CONTENT_WIDTH, text: "  (Tidak ada barang tercatat)", align: "left" }],
					{ rowHeight: 22 },
				)
			} else {
				items.forEach((item, idx) => {
					const desc = item.description || item.name || "-"
					const notes = item.notes || "-"
					const descH = doc.heightOfString(desc, { width: col.desc.w - 4, fontSize: 8 })
					const notesH = doc.heightOfString(notes, { width: col.notes.w - 4, fontSize: 8 })
					const rh = Math.max(descH, notesH) + 10
					const rowH = Math.max(rh, 20)

					y = ensureSpace(rowH, y)

					y = drawTableRow(
						y,
						[
							{ x: col.no.x, w: col.no.w, text: idx + 1, align: "center" },
							{ x: col.desc.x, w: col.desc.w, text: desc },
							{ x: col.out.x, w: col.out.w, text: item.quantity_out || 0, align: "center" },
							{ x: col.in.x, w: col.in.w, text: item.quantity_in || 0, align: "center" },
							{ x: col.condOut.x, w: col.condOut.w, text: item.condition_out || "-", align: "center" },
							{ x: col.condIn.x, w: col.condIn.w, text: item.condition_in || "-", align: "center" },
							{ x: col.notes.x, w: col.notes.w, text: notes },
						],
						{ zebra: idx % 2 === 1, rowHeight: rowH },
					)
				})
			}

			// ======================= CATATAN =======================
			if (delivery.notes) {
				y = ensureSpace(40, y)
				y += 12
				doc.fontSize(8).font("Helvetica-Bold").fillColor(COLOR_MUTED).text("Catatan:", MARGIN, y)
				doc.fontSize(8).font("Helvetica").fillColor(COLOR_TEXT).text(delivery.notes, MARGIN, y + 12, {
					width: CONTENT_WIDTH,
				})
				y = doc.y + 5
			}

			// ======================= TANDA TANGAN =======================

			const signatureHeight = 110
			y = ensureSpace(signatureHeight, y)
			y += 25

			const sigLeftX = MARGIN + 20
			const sigRightX = MARGIN + CONTENT_WIDTH - 190

			doc.fontSize(9).font("Helvetica").fillColor(COLOR_TEXT)
			doc.text("Diserahkan oleh,", sigLeftX, y)
			doc.text("Diterima oleh,", sigRightX, y)

			// Ruang tanda tangan
			const lineY = y + 62
			doc
				.moveTo(sigLeftX, lineY)
				.lineTo(sigLeftX + 150, lineY)
				.lineWidth(0.5)
				.stroke(COLOR_TEXT)
			doc
				.moveTo(sigRightX, lineY)
				.lineTo(sigRightX + 150, lineY)
				.lineWidth(0.5)
				.stroke(COLOR_TEXT)

			doc.fontSize(9).font("Helvetica-Bold").fillColor(COLOR_TEXT)
			doc.text(delivery.driver_name || delivery.company_name || "( ................ )", sigLeftX, lineY + 5, {
				width: 150,
			})
			doc.text(delivery.recipient_name || "( ................ )", sigRightX, lineY + 5, { width: 150 })

			// Gambar header/footer di semua halaman
			finalizePages()

			doc.end()
		} catch (error) {
			console.error("Delivery PDF Generate Error:", error)
			reject(error)
		}
	})
}
