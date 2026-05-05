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

	// Setup edit form submit handler
	const editForm = document.getElementById("editInvoiceForm")
	if (editForm) {
		editForm.addEventListener("submit", submitEditInvoice)
	}
})

// Helper function to format date for input[type="date"]
function formatDateForInput(dateString) {
	if (!dateString) return ""

	// Parse the date string
	const date = new Date(dateString)

	// Check if date is valid
	if (isNaN(date.getTime())) return ""

	// Format to YYYY-MM-DD
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, "0")
	const day = String(date.getDate()).padStart(2, "0")

	return `${year}-${month}-${day}`
}

function generateShareLink() {
	const invoiceId =
		document.querySelector("[data-invoice-id]").dataset.invoiceId

	if (confirm("Generate share link baru?")) {
		fetch(`/admin/invoice/${invoiceId}/generate-share`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
		})
			.then((res) => res.json())
			.then((data) => {
				if (data.success) {
					alert("Share link berhasil dibuat")
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
		alert("Share link telah disalin ke clipboard!")
	}
}

function openEditM() {
	// Get current invoice data from page
	const invoiceId =
		document.querySelector("[data-invoice-id]").dataset.invoiceId

	fetch(`/admin/invoice/${invoiceId}/data`)
		.then((res) => {
			if (!res.ok) {
				throw new Error(`HTTP error! status: ${res.status}`)
			}
			return res.json()
		})
		.then((invoice) => {
			// Populate form with current data
			document.getElementById("invoice_no").value = invoice.invoice_number || ""

			// Format date properly for input[type="date"]
			document.getElementById("inv_date").value = formatDateForInput(
				invoice.invoice_date,
			)

			document.getElementById("edit_recipient_name").value =
				invoice.recipient_name || ""
			document.getElementById("edit_recipient_phone").value =
				invoice.recipient_phone || ""
			document.getElementById("edit_recipient_npwp").value =
				invoice.recipient_npwp || ""
			document.getElementById("edit_recipient_address").value =
				invoice.recipient_address || ""

			// Parse and set items
			editItems =
				typeof invoice.items === "string"
					? JSON.parse(invoice.items)
					: invoice.items || []

			// Parse and set taxes
			editTaxes =
				typeof invoice.taxes === "string"
					? JSON.parse(invoice.taxes)
					: invoice.taxes || []

			// Set discount data
			editDiscountType = invoice.discount_type || "none"
			editDiscountValue = invoice.discount_value || 0

			// Update discount fields
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

			// Show modal
			document.getElementById("editInvoiceModal").style.display = "block"
		})
		.catch((err) => {
			console.error("Error loading invoice:", err)
			alert("Gagal memuat data invoice: " + err.message)
		})
}

function closeEditModal() {
	document.getElementById("editInvoiceModal").style.display = "none"
}

function renderEditItems() {
	const container = document.getElementById("itemsListEdit")
	container.innerHTML = ""

	editItems.forEach((item, index) => {
		const row = document.createElement("div")
		row.className = "item-row"
		row.innerHTML = `
			<input type="text" placeholder="Deskripsi" value="${item.description || item.name || ""}" 
				onchange="updateEditItem(${index}, 'description', this.value)" required />
			<input type="text" placeholder="Satuan" value="${item.unit || ""}" 
				onchange="updateEditItem(${index}, 'unit', this.value)" />
			<input type="number" placeholder="Qty" value="${item.quantity || 0}" 
				onchange="updateEditItem(${index}, 'quantity', parseFloat(this.value))" required />
			<div class="item-price-container-edit">
				<select class="item-price-type" onchange="toggleEditPriceInput(this, ${index})">
					<option value="unit" selected>Harga Satuan</option>
					<option value="total">Harga Total</option>
				</select>
				<input type="number" placeholder="Harga" value="${item.price || 0}" 
					onchange="updateEditItem(${index}, 'price', parseFloat(this.value))" required />
			</div>
			<input type="text" readonly value="Rp ${Math.round((item.quantity || 0) * (item.price || 0)).toLocaleString("id-ID")}" />
			<button type="button" class="remove-btn" onclick="removeEditItem(${index})">×</button>
		`
		container.appendChild(row)
	})
}

function renderEditTaxes() {
	const container = document.getElementById("taxesListEdit")
	container.innerHTML = ""

	editTaxes.forEach((tax, index) => {
		const row = document.createElement("div")
		row.className = "tax-row"
		row.innerHTML = `
			<input type="text" placeholder="Nama Pajak" value="${tax.name || ""}" 
				onchange="updateEditTax(${index}, 'name', this.value)" required />
			<input type="number" placeholder="Persentase (%)" value="${tax.percentage || 0}" 
				onchange="updateEditTax(${index}, 'percentage', parseFloat(this.value))" required />
			<button type="button" class="remove-btn" onclick="removeEditTax(${index})">×</button>
		`
		container.appendChild(row)
	})
}

function addEditItem() {
	editItems.push({ description: "", unit: "", quantity: 1, price: 0 })
	renderEditItems()
	calculateEditTotal()
}

// Toggle price type untuk edit items
function toggleEditPriceInput(select, index) {
	const row = select.closest(".item-row")
	const priceInput = row.querySelector(
		".item-price-container-edit input[type='number']",
	)
	const priceType = select.value

	if (priceType === "unit") {
		priceInput.placeholder = "Harga Satuan"
	} else {
		priceInput.placeholder = "Harga Total"
	}

	// Trigger update untuk refresh total
	updateEditItem(index, "priceType", priceType)
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

function addEditTax() {
	editTaxes.push({ name: "", percentage: 0 })
	renderEditTaxes()
	calculateEditTotal()
}

function updateEditTax(index, field, value) {
	editTaxes[index][field] = value
	calculateEditTotal()
}

// Update discount label sesuai tipe
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
	}

	if (type === "none") {
		input.value = 0
	}

	calculateEditTotal()
}

// Update discount value
function updateEditDiscountValue() {
	editDiscountValue =
		parseFloat(document.getElementById("edit_discount_value").value) || 0
	calculateEditTotal()
}

function calculateEditTotal() {
	// Calculate subtotal from items
	let subtotal = 0
	editItems.forEach((item) => {
		subtotal += (item.quantity || 0) * (item.price || 0)
	})

	// Calculate discount
	let discountAmount = 0
	if (editDiscountType === "percentage") {
		discountAmount = (subtotal * editDiscountValue) / 100
	} else if (editDiscountType === "nominal") {
		discountAmount = editDiscountValue
	}

	// Subtotal after discount
	const subtotalAfterDiscount = subtotal - discountAmount

	// Calculate taxes (based on subtotal after discount)
	let totalTax = 0
	editTaxes.forEach((tax) => {
		const taxAmount = (subtotalAfterDiscount * (tax.percentage || 0)) / 100
		tax.amount = taxAmount
		totalTax += taxAmount
	})

	// Calculate total
	const total = subtotalAfterDiscount + totalTax

	// Update display
	document.getElementById("editTotalAmount").textContent = Math.round(
		total,
	).toLocaleString("id-ID", {
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	})
}

function submitEditInvoice(e) {
	e.preventDefault()

	const invoiceId =
		document.querySelector("[data-invoice-id]").dataset.invoiceId

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
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(formData),
	})
		.then((res) => res.json())
		.then((data) => {
			if (data.success) {
				alert("Invoice berhasil diupdate")
				location.reload()
			} else {
				alert("Gagal mengupdate invoice: " + (data.error || "Unknown error"))
			}
		})
		.catch((err) => {
			console.error("Error:", err)
			alert("Terjadi kesalahan saat mengupdate invoice")
		})
}

function updateStatus() {
	const invoiceId =
		document.querySelector("[data-invoice-id]").dataset.invoiceId
	const status = document.getElementById("statusSelect").value
	const paidDate = document.getElementById("paidDate")?.value

	fetch(`/admin/invoice/${invoiceId}/status`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({ status, paid_date: paidDate || null }),
	})
		.then((res) => res.json())
		.then((data) => {
			if (data.success) {
				alert("Status berhasil diubah")
				location.reload()
			} else {
				alert("Gagal mengubah status")
			}
		})
		.catch((err) => {
			console.error("Error:", err)
			alert("Terjadi kesalahan")
		})
}

function deleteInvoice() {
	const invoiceId =
		document.querySelector("[data-invoice-id]").dataset.invoiceId

	if (
		confirm(
			"Anda yakin ingin menghapus invoice ini? Aksi ini tidak dapat dibatalkan.",
		)
	) {
		fetch(`/admin/invoice/${invoiceId}/delete`, {
			method: "DELETE",
		})
			.then((res) => res.json())
			.then((data) => {
				if (data.success) {
					alert("Invoice berhasil dihapus")
					window.location.href = "/admin/invoice/history"
				} else {
					alert("Gagal menghapus invoice")
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
