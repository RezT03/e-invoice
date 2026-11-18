// Invoice Detail Page Scripts

let editItems = []
let editTaxes = []
let editDiscountType = "none"
let editDiscountValue = 0

document.addEventListener("DOMContentLoaded", function () {
	const shareToken = document.querySelector("[data-share-token]")
	if (shareToken && shareToken.dataset.shareToken) {
		const token = shareToken.dataset.shareToken
		const protocol = window.location.protocol
		const host = window.location.host
		const shareLink = `${protocol}//${host}/invoice/share/${token}`

		const shareLinkInput = document.getElementById("shareLink")
		const shareLinkContainer = document.getElementById("shareLinkContainer")
		const noShareLinkMsg = document.getElementById("noShareLinkMsg")

		if (shareLinkInput) {
			shareLinkInput.value = shareLink
			if (shareLinkContainer) shareLinkContainer.style.display = "block"
			if (noShareLinkMsg) noShareLinkMsg.style.display = "none"
		}
	}

	// Status select listener to toggle paidDate
	const statusSelect = document.getElementById("statusSelect")
	if (statusSelect) {
		statusSelect.addEventListener("change", function () {
			const paidWrapper = document.getElementById("paidDateWrapper")
			if (paidWrapper) {
				paidWrapper.style.display = this.value === "paid" ? "block" : "none"
			}
		})
	}

	// Setup edit form submit handler
	const editForm = document.getElementById("editInvoiceForm")
	if (editForm) {
		editForm.addEventListener("submit", submitEditInvoice)
	}
})

// Helper function to format date for input[type="date"]
function formatDateForInput(dateString) {
	if (!dateString) return ""
	const date = new Date(dateString)
	if (isNaN(date.getTime())) return ""
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, "0")
	const day = String(date.getDate()).padStart(2, "0")
	return `${year}-${month}-${day}`
}

function convertToInvoice() {
	const invoiceId = document.querySelector("[data-invoice-id]").dataset.invoiceId

	if (confirm("Konversi Penawaran ini menjadi Invoice resmi? Nomor dan data akan tetap tersimpan, dan dokumen akan diubah menjadi Invoice.")) {
		fetch(`/admin/invoice/${invoiceId}/convert-to-invoice`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
		})
			.then((res) => res.json())
			.then((data) => {
				if (data.success) {
					alert("Dokumen berhasil dikonversi menjadi Invoice!")
					location.reload()
				} else {
					alert("Gagal: " + (data.error || "Terjadi kesalahan"))
				}
			})
			.catch((err) => {
				console.error("Error:", err)
				alert("Terjadi kesalahan jaringan")
			})
	}
}

function generateShareLink() {
	const invoiceId = document.querySelector("[data-invoice-id]").dataset.invoiceId

	if (confirm("Buat atau perbarui share link publik?")) {
		fetch(`/admin/invoice/${invoiceId}/generate-share`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
		})
			.then((res) => res.json())
			.then((data) => {
				if (data.success) {
					alert("Share link berhasil dibuat!")
					location.reload()
				} else {
					alert("Gagal membuat share link")
				}
			})
			.catch((err) => {
				console.error("Error:", err)
				alert("Terjadi kesalahan")
			})
	}
}

function copyShareLink() {
	const shareLink = document.getElementById("shareLink")
	if (shareLink) {
		shareLink.select()
		document.execCommand("copy")
		alert("Link publik telah disalin!")
	}
}

// ===================== EDIT MODAL =====================

function openEditM() {
	const invoiceId = document.querySelector("[data-invoice-id]").dataset.invoiceId

	fetch(`/admin/invoice/${invoiceId}/data`)
		.then((res) => {
			if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
			return res.json()
		})
		.then((invoice) => {
			document.getElementById("invoice_no").value = invoice.invoice_number || ""
			document.getElementById("inv_date").value = formatDateForInput(invoice.invoice_date)
			document.getElementById("edit_recipient_name").value = invoice.recipient_name || ""
			document.getElementById("edit_recipient_phone").value = invoice.recipient_phone || ""
			document.getElementById("edit_recipient_npwp").value = invoice.recipient_npwp || ""
			document.getElementById("edit_recipient_address").value = invoice.recipient_address || ""

			editItems = typeof invoice.items === "string" ? JSON.parse(invoice.items) : invoice.items || []
			editTaxes = typeof invoice.taxes === "string" ? JSON.parse(invoice.taxes) : invoice.taxes || []

			editDiscountType = invoice.discount_type || "none"
			editDiscountValue = invoice.discount_value || 0

			const discountTypeSelect = document.getElementById("edit_discount_type")
			if (discountTypeSelect) {
				discountTypeSelect.value = editDiscountType
				updateEditDiscountLabel()
			}

			const discountValueInput = document.getElementById("edit_discount_value")
			if (discountValueInput) {
				discountValueInput.value = editDiscountValue
			}

			renderEditItems()
			renderEditTaxes()
			calculateEditTotal()

			document.getElementById("editInvoiceModal").style.display = "block"
		})
		.catch((err) => {
			console.error("Error loading invoice:", err)
			alert("Gagal memuat data: " + err.message)
		})
}

function closeEditModal() {
	document.getElementById("editInvoiceModal").style.display = "none"
}

function renderEditItems() {
	const container = document.getElementById("itemsListEdit")
	container.innerHTML = ""

	editItems.forEach((item, index) => {
		if (item.is_group) {
			// Group block
			const groupDiv = document.createElement("div")
			groupDiv.className = "edit-group-block"
			groupDiv.style.cssText = "background: #f0f4ff; border: 1px solid #c7d7fe; border-radius: 6px; padding: 10px; margin-bottom: 12px;"

			let subItemsHtml = ""
			;(item.items || []).forEach((sub, subIdx) => {
				const lineTot = Math.round((sub.quantity || 0) * (sub.price || 0))
				subItemsHtml += `
					<div class="item-row" style="margin-bottom: 6px;">
						<input type="text" placeholder="Deskripsi" value="${escapeHtmlAttr(sub.description || sub.name || "")}" 
							onchange="updateEditSubItem(${index}, ${subIdx}, 'description', this.value)" required />
						<input type="text" placeholder="Satuan" value="${escapeHtmlAttr(sub.unit || "")}" 
							onchange="updateEditSubItem(${index}, ${subIdx}, 'unit', this.value)" />
						<input type="number" placeholder="Qty" value="${sub.quantity || 0}" step="0.01" min="0"
							oninput="updateEditSubItem(${index}, ${subIdx}, 'quantity', parseFloat(this.value) || 0)" required />
						<input type="number" placeholder="Harga" value="${sub.price || 0}" step="0.01" min="0"
							oninput="updateEditSubItem(${index}, ${subIdx}, 'price', parseFloat(this.value) || 0)" required />
						<input type="text" readonly value="Rp ${lineTot.toLocaleString('id-ID')}" style="background:#f4f6fb;" />
						<button type="button" class="remove-btn" onclick="removeEditSubItem(${index}, ${subIdx})" title="Hapus item">×</button>
					</div>
				`
			})

			groupDiv.innerHTML = `
				<div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px;">
					<span style="font-weight: 700; color: #0356fc; font-size: 0.85rem; white-space: nowrap;">Group:</span>
					<input type="text" value="${escapeHtmlAttr(item.group_name || "")}" 
						placeholder="Nama Group (mis: I. Musik)"
						oninput="editItems[${index}].group_name = this.value"
						style="flex: 1; padding: 4px 8px; border: 1px solid #93b4fd; border-radius: 4px; font-weight: 600;" />
					<button type="button" class="btn btn-sm" onclick="copyEditGroup(${index})" style="padding: 4px 8px; font-size: 0.78rem; background: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe;"><i class="fa-solid fa-copy"></i> Copy</button>
					<button type="button" class="remove-btn" onclick="removeEditItem(${index})" title="Hapus Group" style="padding: 4px 8px; font-size: 0.78rem;">Hapus Group</button>
				</div>
				<div class="sub-items-container" style="padding-left: 8px; border-left: 2px solid #0356fc;">
					${subItemsHtml}
					<button type="button" class="btn btn-sm" onclick="addEditSubItem(${index})" style="margin-top: 4px; font-size: 0.8rem; background: #e8f0ff; color: #0356fc; border: 1px dashed #0356fc;">+ Tambah Item di Group Ini</button>
				</div>
			`
			container.appendChild(groupDiv)
		} else {
			// Flat item
			const row = document.createElement("div")
			row.className = "item-row"
			const lineTot = Math.round((item.quantity || 0) * (item.price || 0))
			row.innerHTML = `
				<input type="text" placeholder="Deskripsi" value="${escapeHtmlAttr(item.description || item.name || "")}" 
					onchange="updateEditItem(${index}, 'description', this.value)" required />
				<input type="text" placeholder="Satuan" value="${escapeHtmlAttr(item.unit || "")}" 
					onchange="updateEditItem(${index}, 'unit', this.value)" />
				<input type="number" placeholder="Qty" value="${item.quantity || 0}" step="0.01" min="0"
					oninput="updateEditItem(${index}, 'quantity', parseFloat(this.value) || 0)" required />
				<input type="number" placeholder="Harga" value="${item.price || 0}" step="0.01" min="0"
					oninput="updateEditItem(${index}, 'price', parseFloat(this.value) || 0)" required />
				<input type="text" readonly value="Rp ${lineTot.toLocaleString('id-ID')}" style="background:#f4f6fb;" />
				<button type="button" class="remove-btn" onclick="removeEditItem(${index})">×</button>
			`
			container.appendChild(row)
		}
	})
}

function escapeHtmlAttr(str) {
	return String(str || "").replace(/"/g, "&quot;")
}

function addEditGroup() {
	editItems.push({
		is_group: true,
		group_name: "Grup Baru",
		items: [{ description: "", unit: "", quantity: 1, price: 0 }]
	})
	renderEditItems()
	calculateEditTotal()
}

function copyEditGroup(index) {
	const src = editItems[index]
	if (!src || !src.is_group) return
	const copy = {
		is_group: true,
		group_name: (src.group_name || "Grup") + " (copy)",
		items: (src.items || []).map(i => ({ ...i }))
	}
	editItems.splice(index + 1, 0, copy)
	renderEditItems()
	calculateEditTotal()
}

function addEditSubItem(groupIndex) {
	if (!editItems[groupIndex].items) editItems[groupIndex].items = []
	editItems[groupIndex].items.push({ description: "", unit: "", quantity: 1, price: 0 })
	renderEditItems()
	calculateEditTotal()
}

function updateEditSubItem(groupIndex, subIndex, field, value) {
	if (editItems[groupIndex] && editItems[groupIndex].items[subIndex]) {
		editItems[groupIndex].items[subIndex][field] = value
		calculateEditTotal()
	}
}

function removeEditSubItem(groupIndex, subIndex) {
	if (editItems[groupIndex] && editItems[groupIndex].items) {
		editItems[groupIndex].items.splice(subIndex, 1)
		renderEditItems()
		calculateEditTotal()
	}
}

function addEditItem() {
	editItems.push({ description: "", unit: "", quantity: 1, price: 0 })
	renderEditItems()
	calculateEditTotal()
}

function updateEditItem(index, field, value) {
	editItems[index][field] = value
	renderEditItems()
	calculateEditTotal()
}

function removeEditItem(index) {
	editItems.splice(index, 1)
	renderEditItems()
	calculateEditTotal()
}

// Taxes in modal
function renderEditTaxes() {
	const container = document.getElementById("taxesListEdit")
	container.innerHTML = ""

	editTaxes.forEach((tax, index) => {
		const row = document.createElement("div")
		row.className = "tax-row"
		row.innerHTML = `
			<input type="text" placeholder="Nama Pajak" value="${escapeHtmlAttr(tax.name || "")}" 
				onchange="updateEditTax(${index}, 'name', this.value)" required />
			<input type="number" placeholder="Persentase (%)" value="${tax.percentage || 0}" step="0.01" min="0" max="100"
				oninput="updateEditTax(${index}, 'percentage', parseFloat(this.value) || 0)" required />
			<button type="button" class="remove-btn" onclick="removeEditTax(${index})">×</button>
		`
		container.appendChild(row)
	})
}

function addEditTax() {
	editTaxes.push({ name: "", percentage: 0 })
	renderEditTaxes()
	calculateEditTotal()
}

function updateEditTax(index, field, value) {
	editTaxes[index][field] = value
	calculateEditTotal()
}

function removeEditTax(index) {
	editTaxes.splice(index, 1)
	renderEditTaxes()
	calculateEditTotal()
}

// Discount in modal
function updateEditDiscountLabel() {
	const type = document.getElementById("edit_discount_type").value
	const label = document.getElementById("edit_discountLabel")
	const input = document.getElementById("edit_discount_value")

	editDiscountType = type

	if (type === "percentage") {
		label.textContent = "Diskon (%):"
		input.placeholder = "Misal: 10 untuk 10%"
		input.step = "0.01"
	} else if (type === "nominal") {
		label.textContent = "Diskon (Rp):"
		input.placeholder = "Misal: 50000"
		input.step = "1"
	} else {
		label.textContent = "Diskon:"
		input.value = 0
	}

	calculateEditTotal()
}

function updateEditDiscountValue() {
	editDiscountValue = parseFloat(document.getElementById("edit_discount_value").value) || 0
	calculateEditTotal()
}

function calculateEditTotal() {
	let subtotal = 0
	editItems.forEach((item) => {
		if (item.is_group) {
			(item.items || []).forEach((sub) => {
				subtotal += (sub.quantity || 0) * (sub.price || 0)
			})
		} else {
			subtotal += (item.quantity || 0) * (item.price || 0)
		}
	})

	let discountAmount = 0
	if (editDiscountType === "percentage") {
		discountAmount = (subtotal * editDiscountValue) / 100
	} else if (editDiscountType === "nominal") {
		discountAmount = editDiscountValue
	}

	const subtotalAfterDiscount = subtotal - discountAmount

	let totalTax = 0
	editTaxes.forEach((tax) => {
		const taxAmount = (subtotalAfterDiscount * (tax.percentage || 0)) / 100
		tax.amount = taxAmount
		totalTax += taxAmount
	})

	const total = subtotalAfterDiscount + totalTax

	const el = document.getElementById("editTotalAmount")
	if (el) {
		el.textContent = Math.round(total).toLocaleString("id-ID")
	}
}

function submitEditInvoice(e) {
	e.preventDefault()

	const invoiceId = document.querySelector("[data-invoice-id]").dataset.invoiceId

	const formData = {
		invoice_number: document.getElementById("invoice_no").value,
		invoice_date: document.getElementById("inv_date").value,
		recipient_name: document.getElementById("edit_recipient_name").value,
		recipient_phone: document.getElementById("edit_recipient_phone").value,
		recipient_npwp: document.getElementById("edit_recipient_npwp").value,
		recipient_address: document.getElementById("edit_recipient_address").value,
		items: editItems,
		taxes: editTaxes,
		discount_type: editDiscountType,
		discount_value: editDiscountValue,
	}

	fetch(`/admin/invoice/${invoiceId}/update`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(formData),
	})
		.then((res) => res.json())
		.then((data) => {
			if (data.success) {
				alert("Dokumen berhasil diperbarui")
				location.reload()
			} else {
				alert("Gagal: " + (data.error || "Unknown error"))
			}
		})
		.catch((err) => {
			console.error("Error:", err)
			alert("Terjadi kesalahan saat mengupdate")
		})
}

function updateStatus() {
	const invoiceId = document.querySelector("[data-invoice-id]").dataset.invoiceId
	const status = document.getElementById("statusSelect").value
	const paidDate = document.getElementById("paidDate")?.value

	fetch(`/admin/invoice/${invoiceId}/status`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ status, paid_date: paidDate || null }),
	})
		.then((res) => res.json())
		.then((data) => {
			if (data.success) {
				alert("Status berhasil diperbarui")
				location.reload()
			} else {
				alert("Gagal memperbarui status")
			}
		})
		.catch((err) => {
			console.error("Error:", err)
			alert("Terjadi kesalahan")
		})
}

function deleteInvoice() {
	const invoiceId = document.querySelector("[data-invoice-id]").dataset.invoiceId

	if (confirm("Anda yakin ingin menghapus dokumen ini? Aksi ini tidak dapat dibatalkan.")) {
		fetch(`/admin/invoice/${invoiceId}/delete`, {
			method: "DELETE",
		})
			.then((res) => res.json())
			.then((data) => {
				if (data.success) {
					alert("Dokumen berhasil dihapus")
					window.location.href = "/admin/invoice/history"
				} else {
					alert("Gagal menghapus dokumen")
				}
			})
			.catch((err) => {
				console.error("Error:", err)
				alert("Terjadi kesalahan")
			})
	}
}

// Close modal when clicking outside
window.onclick = function (event) {
	const modal = document.getElementById("editInvoiceModal")
	if (event.target === modal) {
		closeEditModal()
	}
}
