// Product List Page Scripts
let productSearchTimeout

function applyProductFilters() {
	const search = document.getElementById("searchFilter")?.value || ""
	const category = document.getElementById("categoryFilter")?.value || ""
	const status = document.getElementById("statusFilter")?.value || ""
	const sort = document.getElementById("sortFilter")?.value || ""

	const params = new URLSearchParams()
	if (search) params.append("search", search)
	if (category) params.append("category", category)
	if (status) params.append("status", status)
	if (sort) params.append("sort", sort)
	params.append("page", "1")

	window.location.href = `?${params.toString()}`
}

function resetProductFilters() {
	const searchEl = document.getElementById("searchFilter")
	const categoryEl = document.getElementById("categoryFilter")
	const statusEl = document.getElementById("statusFilter")
	const sortEl = document.getElementById("sortFilter")
	if (searchEl) searchEl.value = ""
	if (categoryEl) categoryEl.value = ""
	if (statusEl) statusEl.value = ""
	if (sortEl) sortEl.value = "name_asc"
	window.location.href = window.location.pathname
}

document.addEventListener("DOMContentLoaded", () => {
	const searchInput = document.getElementById("searchFilter")
	const categorySelect = document.getElementById("categoryFilter")
	const statusSelect = document.getElementById("statusFilter")
	const sortSelect = document.getElementById("sortFilter")
	const btnApply = document.getElementById("btnApplyFilters")
	const btnReset = document.getElementById("btnResetFilters")

	if (searchInput) {
		searchInput.addEventListener("input", () => {
			clearTimeout(productSearchTimeout)
			productSearchTimeout = setTimeout(applyProductFilters, 500)
		})
		searchInput.addEventListener("keypress", (e) => {
			if (e.key === "Enter") applyProductFilters()
		})
	}

	if (categorySelect) categorySelect.addEventListener("change", applyProductFilters)
	if (statusSelect) statusSelect.addEventListener("change", applyProductFilters)
	if (sortSelect) sortSelect.addEventListener("change", applyProductFilters)
	if (btnApply) btnApply.addEventListener("click", applyProductFilters)
	if (btnReset) btnReset.addEventListener("click", resetProductFilters)
})
