// Nama file PDF pendek dan konsisten untuk download.
//   inv-(N)NOMOR.pdf   invoice, template normal
//   inv-(DX)NOMOR.pdf  invoice, template dotmatrix
//   pen-(N)NOMOR.pdf   penawaran/quotation, template normal
//   pen-(DX)NOMOR.pdf  penawaran/quotation, template dotmatrix

const MAX_NUMBER_LENGTH = 80

function sanitizeNumber(value) {
	const clean = String(value == null ? "" : value)
		.trim()
		// Karakter yang bermasalah di nama file diganti "-".
		.replace(/[\\/:*?"<>|]+/g, "-")
		.replace(/\s+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, MAX_NUMBER_LENGTH)
		.replace(/-+$/g, "")

	return clean || "document"
}

function getDocumentFilename(document, templateType) {
	const isQuotation = document && document.document_type === "quotation"
	const prefix = isQuotation ? "pen" : "inv"
	const marker = templateType === "dotmatrix" ? "DX" : "N"
	const number = sanitizeNumber(document && document.invoice_number)

	return `${prefix}-(${marker})${number}.pdf`
}

// Header Content-Disposition dengan fallback ASCII dan dukungan UTF-8 (RFC 5987).
function buildContentDisposition(disposition, filename) {
	const fallback = String(filename)
		.replace(/[^\x20-\x7E]/g, "_")
		.replace(/["\\]/g, "_")

	return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`
}

module.exports = { getDocumentFilename, sanitizeNumber, buildContentDisposition }
