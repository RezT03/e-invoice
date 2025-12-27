// Utility functions for currency and number formatting

function formatRupiah(num) {
	if (num === null || num === undefined) num = 0
	return (
		"Rp " +
		Math.round(num).toLocaleString("id-ID", {
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		})
	)
}

function formatNumber(num) {
	if (num === null || num === undefined) num = 0
	return Math.round(num).toLocaleString("id-ID", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	})
}

function parseRupiah(str) {
	if (typeof str !== "string") return 0
	// Remove "Rp " dan replace titik dengan kosong
	const cleaned = str
		.replace(/Rp\s?/g, "")
		.replace(/\./g, "")
		.replace(/,/g, ".")
	return parseFloat(cleaned) || 0
}
