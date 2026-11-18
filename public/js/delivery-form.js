// Surat Jalan Form — autofill penerima + daftar barang dinamis
document.addEventListener("DOMContentLoaded", () => {
	const form = document.getElementById("deliveryForm")
	if (!form) return

	initCustomerPicker()
	initBookingPicker()
	initItems()
})

// ===================== PELANGGAN & BOOKING =====================
function initCustomerPicker() {
	const picker = document.getElementById("customer_picker")
	if (!picker) return

	const idField = document.getElementById("customer_id")
	const nameEl = document.getElementById("recipient_name")
	const phoneEl = document.getElementById("recipient_phone")
	const addressEl = document.getElementById("recipient_address")

	picker.addEventListener("change", () => {
		const opt = picker.options[picker.selectedIndex]
		if (idField) idField.value = opt ? opt.value || "" : ""

		// Pilihan kosong = isi manual, jangan timpa apa pun
		if (!opt || !opt.value) return

		if (nameEl) nameEl.value = opt.dataset.name || ""
		if (phoneEl) phoneEl.value = opt.dataset.phone || ""
		if (addressEl) addressEl.value = opt.dataset.address || ""
	})
}

function initBookingPicker() {
	const picker = document.getElementById("booking_picker")
	if (!picker) return

	const idField = document.getElementById("booking_id")
	const custIdField = document.getElementById("customer_id")
	const custPicker = document.getElementById("customer_picker")
	const nameEl = document.getElementById("recipient_name")
	const phoneEl = document.getElementById("recipient_phone")
	const addressEl = document.getElementById("recipient_address")

	picker.addEventListener("change", () => {
		const opt = picker.options[picker.selectedIndex]
		if (idField) idField.value = opt ? opt.value || "" : ""
		if (!opt || !opt.value) return

		if (nameEl && !nameEl.value) nameEl.value = opt.dataset.name || ""
		if (phoneEl && !phoneEl.value) phoneEl.value = opt.dataset.phone || ""
		if (addressEl && !addressEl.value) addressEl.value = opt.dataset.location || ""

		// Sinkronkan tautan pelanggan bila booking punya customer_id
		const custId = opt.dataset.customerId || ""
		if (custId && custPicker && custIdField) {
			custPicker.value = custId
			custIdField.value = custId
		}
	})
}

// ===================== DAFTAR BARANG =====================
function initItems() {
	const body = document.getElementById("itemsBody")
	const addBtn = document.getElementById("btnAddItem")
	const form = document.getElementById("deliveryForm")
	const hidden = document.getElementById("itemsJson")
	if (!body || !form) return

	if (!body.querySelector(".item-row")) addItemRow(body)

	if (addBtn) addBtn.addEventListener("click", () => addItemRow(body))

	body.addEventListener("click", (e) => {
		const btn = e.target.closest(".btn-remove-item")
		if (!btn) return
		const row = btn.closest(".item-row")
		if (row) row.remove()
		// Sisakan minimal satu baris
		if (!body.querySelector(".item-row")) addItemRow(body)
	})

	form.addEventListener("submit", () => {
		const items = []
		body.querySelectorAll(".item-row").forEach((row) => {
			const description = row.querySelector(".it-description")?.value.trim() || ""
			if (!description) return
			items.push({
				description,
				quantity_out: parseInt(row.querySelector(".it-qty-out")?.value, 10) || 0,
				quantity_in: parseInt(row.querySelector(".it-qty-in")?.value, 10) || 0,
				condition_out: row.querySelector(".it-cond-out")?.value.trim() || null,
				condition_in: row.querySelector(".it-cond-in")?.value.trim() || null,
				notes: row.querySelector(".it-notes")?.value.trim() || null,
			})
		})
		if (hidden) hidden.value = JSON.stringify(items)
	})
}

function addItemRow(body) {
	const row = document.createElement("tr")
	row.className = "item-row"
	row.innerHTML = `
		<td><input type="text" class="it-description" placeholder="mis. Tenda 4x6" /></td>
		<td><input type="number" class="it-qty-out" min="0" step="1" style="text-align:center;" value="0" /></td>
		<td><input type="number" class="it-qty-in" min="0" step="1" style="text-align:center;" value="0" /></td>
		<td><input type="text" class="it-cond-out" placeholder="Baik" /></td>
		<td><input type="text" class="it-cond-in" placeholder="Baik" /></td>
		<td><input type="text" class="it-notes" placeholder="-" /></td>
		<td style="text-align:center;"><button type="button" class="btn-small danger btn-remove-item" title="Hapus baris">&times;</button></td>
	`
	body.appendChild(row)
}
