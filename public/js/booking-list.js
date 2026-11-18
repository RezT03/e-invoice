// Booking List Page Scripts
let bookingSearchTimeout

function applyBookingFilters() {
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

function resetBookingFilters() {
	const searchEl = document.getElementById("searchFilter")
	const statusEl = document.getElementById("statusFilter")
	const sortEl = document.getElementById("sortFilter")
	if (searchEl) searchEl.value = ""
	if (statusEl) statusEl.value = ""
	if (sortEl) sortEl.value = "event_start_desc"
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
			clearTimeout(bookingSearchTimeout)
			bookingSearchTimeout = setTimeout(applyBookingFilters, 500)
		})
		searchInput.addEventListener("keypress", (e) => {
			if (e.key === "Enter") applyBookingFilters()
		})
	}

	if (statusSelect) statusSelect.addEventListener("change", applyBookingFilters)
	if (sortSelect) sortSelect.addEventListener("change", applyBookingFilters)
	if (btnApply) btnApply.addEventListener("click", applyBookingFilters)
	if (btnReset) btnReset.addEventListener("click", resetBookingFilters)
})
