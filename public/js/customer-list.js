// Customer List Page Scripts
let customerSearchTimeout

function applyCustomerFilters() {
	const search = document.getElementById("searchFilter")?.value || ""
	const status = document.getElementById("statusFilter")?.value || ""
	const sort = document.getElementById("sortFilter")?.value || ""

	const params = new URLSearchParams()
	if (search) params.append("search", search)
	if (status) params.append("status", status)
	if (sort) params.append("sort", sort)
	params.append("page", "1")

	window.location.href = `?${params.toString()}`
}

function resetCustomerFilters() {
	const searchEl = document.getElementById("searchFilter")
	const statusEl = document.getElementById("statusFilter")
	const sortEl = document.getElementById("sortFilter")
	if (searchEl) searchEl.value = ""
	if (statusEl) statusEl.value = ""
	if (sortEl) sortEl.value = "name_asc"
	window.location.href = window.location.pathname
}

document.addEventListener("DOMContentLoaded", () => {
	const searchInput = document.getElementById("searchFilter")
	const statusSelect = document.getElementById("statusFilter")
	const sortSelect = document.getElementById("sortFilter")
	const btnApply = document.getElementById("btnApplyFilters")
	const btnReset = document.getElementById("btnResetFilters")

	if (searchInput) {
		searchInput.addEventListener("input", () => {
			clearTimeout(customerSearchTimeout)
			customerSearchTimeout = setTimeout(applyCustomerFilters, 500)
		})
		searchInput.addEventListener("keypress", (e) => {
			if (e.key === "Enter") applyCustomerFilters()
		})
	}

	if (statusSelect) statusSelect.addEventListener("change", applyCustomerFilters)
	if (sortSelect) sortSelect.addEventListener("change", applyCustomerFilters)
	if (btnApply) btnApply.addEventListener("click", applyCustomerFilters)
	if (btnReset) btnReset.addEventListener("click", resetCustomerFilters)
})
