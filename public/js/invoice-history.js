// Invoice History Page Scripts

let searchTimeout

// Get URL params
function getURLParams() {
	const params = new URLSearchParams(window.location.search)
	return {
		search: params.get("search") || "",
		date: params.get("date") || "",
		status: params.get("status") || "",
	}
}

// Set initial values from URL
function initializeFilters() {
	const params = getURLParams()
	document.getElementById("searchFilter").value = params.search
	document.getElementById("dateFilter").value = params.date
	document.getElementById("statusFilter").value = params.status
}

// Apply filters with AJAX
function applyFilters() {
	const search = document.getElementById("searchFilter").value
	const date = document.getElementById("dateFilter").value
	const status = document.getElementById("statusFilter").value

	const params = new URLSearchParams()
	if (search) params.append("search", search)
	if (date) params.append("date", date)
	if (status) params.append("status", status)
	params.append("page", "1")

	window.location.href = `?${params.toString()}`
}

// Reset filters
function resetFilters() {
	document.getElementById("searchFilter").value = ""
	document.getElementById("dateFilter").value = ""
	document.getElementById("statusFilter").value = ""
	window.location.href = window.location.pathname
}

// Realtime search on input
function handleSearchInput() {
	clearTimeout(searchTimeout)
	searchTimeout = setTimeout(() => {
		applyFilters()
	}, 500)
}

// Event listeners
document.addEventListener("DOMContentLoaded", () => {
	initializeFilters()

	const searchInput = document.getElementById("searchFilter")
	const dateInput = document.getElementById("dateFilter")
	const statusSelect = document.getElementById("statusFilter")
	const btnApply = document.getElementById("btnApplyFilters")
	const btnReset = document.getElementById("btnResetFilters")

	if (!searchInput || !dateInput || !statusSelect) return

	// Realtime search
	searchInput.addEventListener("input", handleSearchInput)

	// Date filter realtime
	dateInput.addEventListener("change", applyFilters)

	// Status filter realtime
	statusSelect.addEventListener("change", applyFilters)

	// Button listeners
	if (btnApply) btnApply.addEventListener("click", applyFilters)
	if (btnReset) btnReset.addEventListener("click", resetFilters)

	// Enter key for search
	searchInput.addEventListener("keypress", (e) => {
		if (e.key === "Enter") {
			applyFilters()
		}
	})
})
