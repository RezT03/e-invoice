// Delivery (Surat Jalan) List Page Scripts
let deliverySearchTimeout

function applyDeliveryFilters() {
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

function resetDeliveryFilters() {
	const searchEl = document.getElementById("searchFilter")
	const statusEl = document.getElementById("statusFilter")
	const sortEl = document.getElementById("sortFilter")
	if (searchEl) searchEl.value = ""
	if (statusEl) statusEl.value = ""
	if (sortEl) sortEl.value = "delivery_date_desc"
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
			clearTimeout(deliverySearchTimeout)
			deliverySearchTimeout = setTimeout(applyDeliveryFilters, 500)
		})
		searchInput.addEventListener("keypress", (e) => {
			if (e.key === "Enter") applyDeliveryFilters()
		})
	}

	if (statusSelect) statusSelect.addEventListener("change", applyDeliveryFilters)
	if (sortSelect) sortSelect.addEventListener("change", applyDeliveryFilters)
	if (btnApply) btnApply.addEventListener("click", applyDeliveryFilters)
	if (btnReset) btnReset.addEventListener("click", resetDeliveryFilters)
})
