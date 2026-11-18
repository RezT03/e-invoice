// Booking Form — auto-isi data klien dari Master Pelanggan
document.addEventListener("DOMContentLoaded", () => {
	const picker = document.getElementById("customer_picker")
	if (!picker) return

	const idField = document.getElementById("customer_id")
	const nameEl = document.getElementById("customer_name")
	const phoneEl = document.getElementById("customer_phone")
	const emailEl = document.getElementById("customer_email")

	// Saat halaman dibuka, pastikan hidden customer_id sinkron dengan pilihan
	const syncId = () => {
		const opt = picker.options[picker.selectedIndex]
		if (idField) idField.value = opt ? opt.value || "" : ""
	}

	picker.addEventListener("change", () => {
		const opt = picker.options[picker.selectedIndex]
		syncId()

		// Pilihan kosong = isi manual, jangan timpa apa pun
		if (!opt || !opt.value) return

		if (nameEl) nameEl.value = opt.dataset.name || ""
		if (phoneEl) phoneEl.value = opt.dataset.phone || ""
		if (emailEl) emailEl.value = opt.dataset.email || ""
	})

	syncId()
})
