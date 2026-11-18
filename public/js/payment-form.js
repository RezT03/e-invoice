// Payment Form — tautkan invoice, tampilkan sisa, isi otomatis jumlah,
// dan pratinjau bukti bayar yang dipilih.
document.addEventListener("DOMContentLoaded", () => {
	initProofPreview()

	const picker = document.getElementById("invoice_picker")
	if (!picker) return

	const idField = document.getElementById("invoice_id")
	const amountEl = document.getElementById("amount")
	const custPicker = document.getElementById("customer_picker")
	const custIdField = document.getElementById("customer_id")
	const infoEl = document.getElementById("invoiceInfo")

	const fmt = (n) => "Rp " + (Number(n) || 0).toLocaleString("id-ID")

	function selectedOpt() {
		return picker.options[picker.selectedIndex]
	}

	function renderInfo() {
		const opt = selectedOpt()
		if (idField) idField.value = opt ? opt.value || "" : ""

		if (!opt || !opt.value) {
			if (infoEl) {
				infoEl.style.display = "none"
				infoEl.innerHTML = ""
			}
			return
		}

		const total = Number(opt.dataset.total) || 0
		const paid = Number(opt.dataset.paid) || 0
		const remaining = Number(opt.dataset.remaining) || 0

		if (infoEl) {
			infoEl.style.display = "flex"
			infoEl.innerHTML = `
				<div><span class="pii-label">Total Invoice</span><span class="pii-value">${fmt(total)}</span></div>
				<div><span class="pii-label">Sudah Dibayar</span><span class="pii-value">${fmt(paid)}</span></div>
				<div><span class="pii-label">Sisa</span><span class="pii-value pii-remaining">${fmt(remaining)}</span></div>
			`
		}
	}

	// Isi jumlah dengan sisa tagihan bila kolom jumlah masih kosong
	function maybePrefillAmount() {
		const opt = selectedOpt()
		if (!opt || !opt.value || !amountEl) return
		if (amountEl.value && Number(amountEl.value) !== 0) return
		const remaining = Number(opt.dataset.remaining) || 0
		if (remaining > 0) amountEl.value = remaining
	}

	picker.addEventListener("change", () => {
		renderInfo()
		maybePrefillAmount()

		const opt = selectedOpt()
		const cid = opt ? opt.dataset.customerId || "" : ""
		if (cid && custPicker) {
			custPicker.value = cid
			if (custIdField) custIdField.value = cid
		}
	})

	if (custPicker) {
		custPicker.addEventListener("change", () => {
			if (custIdField) custIdField.value = custPicker.value || ""
		})
	}

	// Sinkronkan saat halaman dibuka (edit / preset invoice)
	renderInfo()
	maybePrefillAmount()
})

// Pratinjau bukti bayar yang dipilih sebelum diunggah
function initProofPreview() {
	const input = document.getElementById("proof")
	if (!input) return

	const wrap = document.getElementById("proofPreview")
	const img = document.getElementById("proofPreviewImg")
	const nameEl = document.getElementById("proofPreviewName")
	const noteEl = document.getElementById("proofPreviewNote")
	const clearBtn = document.getElementById("proofPreviewClear")
	const removeChk = document.getElementById("removeProof")

	let objectUrl = null

	function reset() {
		if (objectUrl) {
			URL.revokeObjectURL(objectUrl)
			objectUrl = null
		}
		input.value = ""
		if (wrap) wrap.style.display = "none"
		if (img) {
			img.removeAttribute("src")
			img.style.display = "block"
		}
		if (nameEl) nameEl.textContent = ""
		if (noteEl) noteEl.style.display = "none"
	}

	input.addEventListener("change", () => {
		const file = input.files && input.files[0]
		if (!file) {
			reset()
			return
		}

		const name = (file.name || "").toLowerCase()
		const isHeic =
			name.endsWith(".heic") ||
			name.endsWith(".heif") ||
			(file.type || "").toLowerCase().includes("hei")

		if (nameEl) nameEl.textContent = file.name
		if (wrap) wrap.style.display = "flex"

		if (isHeic) {
			if (img) {
				img.removeAttribute("src")
				img.style.display = "none"
			}
			if (noteEl) noteEl.style.display = "block"
		} else {
			if (objectUrl) URL.revokeObjectURL(objectUrl)
			objectUrl = URL.createObjectURL(file)
			if (img) {
				img.src = objectUrl
				img.style.display = "block"
			}
			if (noteEl) noteEl.style.display = "none"
		}

		// Memilih file baru membatalkan niat menghapus bukti lama
		if (removeChk) removeChk.checked = false
	})

	if (clearBtn) clearBtn.addEventListener("click", reset)

	if (removeChk) {
		removeChk.addEventListener("change", () => {
			if (removeChk.checked && input.files && input.files.length) reset()
		})
	}
}
