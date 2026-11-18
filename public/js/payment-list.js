// Payment List Page Scripts
let paymentSearchTimeout

function applyPaymentFilters() {
	const search = document.getElementById("searchFilter")?.value || ""
	const method = document.getElementById("methodFilter")?.value || ""
	const sort = document.getElementById("sortFilter")?.value || ""

	const params = new URLSearchParams()
	if (search) params.append("search", search)
	if (method) params.append("method", method)
	if (sort) params.append("sort", sort)
	params.append("page", "1")

	window.location.href = `?${params.toString()}`
}

function resetPaymentFilters() {
	const searchEl = document.getElementById("searchFilter")
	const methodEl = document.getElementById("methodFilter")
	const sortEl = document.getElementById("sortFilter")
	if (searchEl) searchEl.value = ""
	if (methodEl) methodEl.value = ""
	if (sortEl) sortEl.value = "payment_date_desc"
	window.location.href = window.location.pathname
}

document.addEventListener("DOMContentLoaded", () => {
	const searchInput = document.getElementById("searchFilter")
	const methodSelect = document.getElementById("methodFilter")
	const sortSelect = document.getElementById("sortFilter")
	const btnApply = document.getElementById("btnApplyFilters")
	const btnReset = document.getElementById("btnResetFilters")

	if (searchInput) {
		searchInput.addEventListener("input", () => {
			clearTimeout(paymentSearchTimeout)
			paymentSearchTimeout = setTimeout(applyPaymentFilters, 500)
		})
		searchInput.addEventListener("keypress", (e) => {
			if (e.key === "Enter") applyPaymentFilters()
		})
	}

	if (methodSelect) methodSelect.addEventListener("change", applyPaymentFilters)
	if (sortSelect) sortSelect.addEventListener("change", applyPaymentFilters)
	if (btnApply) btnApply.addEventListener("click", applyPaymentFilters)
	if (btnReset) btnReset.addEventListener("click", resetPaymentFilters)
})
