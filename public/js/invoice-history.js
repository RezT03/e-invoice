// Invoice History Page Scripts

let searchTimeout

// Get URL params
function getURLParams() {
	const params = new URLSearchParams(window.location.search)
	return {
		search: params.get("search") || "",
		date: params.get("date") || "",
		status: params.get("status") || "",
		document_type: params.get("document_type") || "",
		sort: params.get("sort") || "invoice_date_desc",
	}
}

// Set initial values from URL
function initializeFilters() {
	const params = getURLParams()
	const searchEl = document.getElementById("searchFilter")
	const dateEl = document.getElementById("dateFilter")
	const statusEl = document.getElementById("statusFilter")
	const docTypeEl = document.getElementById("docTypeFilter")
	const sortEl = document.getElementById("sortFilter")

	if (searchEl) searchEl.value = params.search
	if (dateEl) dateEl.value = params.date
	if (statusEl) statusEl.value = params.status
	if (docTypeEl) docTypeEl.value = params.document_type
	if (sortEl) sortEl.value = params.sort
}

// Apply filters
function applyFilters() {
	const search = document.getElementById("searchFilter")?.value || ""
	const date = document.getElementById("dateFilter")?.value || ""
	const status = document.getElementById("statusFilter")?.value || ""
	const docType = document.getElementById("docTypeFilter")?.value || ""
	const sort = document.getElementById("sortFilter")?.value || ""

	const params = new URLSearchParams()
	if (search) params.append("search", search)
	if (date) params.append("date", date)
	if (status) params.append("status", status)
	if (docType) params.append("document_type", docType)
	if (sort) params.append("sort", sort)
	params.append("page", "1")

	window.location.href = `?${params.toString()}`
}

// Reset filters
function resetFilters() {
	const searchEl = document.getElementById("searchFilter")
	const dateEl = document.getElementById("dateFilter")
	const statusEl = document.getElementById("statusFilter")
	const docTypeEl = document.getElementById("docTypeFilter")

	if (searchEl) searchEl.value = ""
	if (dateEl) dateEl.value = ""
	if (statusEl) statusEl.value = ""
	if (docTypeEl) docTypeEl.value = ""

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
	const docTypeSelect = document.getElementById("docTypeFilter")
	const sortSelect = document.getElementById("sortFilter")
	const btnApply = document.getElementById("btnApplyFilters")
	const btnReset = document.getElementById("btnResetFilters")

	if (searchInput) {
		searchInput.addEventListener("input", handleSearchInput)
		searchInput.addEventListener("keypress", (e) => {
			if (e.key === "Enter") applyFilters()
		})
	}

	if (dateInput) dateInput.addEventListener("change", applyFilters)
	if (statusSelect) statusSelect.addEventListener("change", applyFilters)
	if (docTypeSelect) docTypeSelect.addEventListener("change", applyFilters)
	if (sortSelect) sortSelect.addEventListener("change", applyFilters)

	if (btnApply) btnApply.addEventListener("click", applyFilters)
	if (btnReset) btnReset.addEventListener("click", resetFilters)
})
