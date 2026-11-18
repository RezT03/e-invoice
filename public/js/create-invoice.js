// Create Invoice / Quotation — Full Script with Grouping Support

document.addEventListener("DOMContentLoaded", function () {
	// Set default date to today
	const invoiceDateInput = document.getElementById("invoice_date")
	if (invoiceDateInput) {
		const today = new Date()
		invoiceDateInput.value = today.toISOString().split("T")[0]
	}

	// Add first item by default (ungrouped)
	addItem(null)

	// Discount listeners
	const discountTypeSelect = document.getElementById("discount_type")
	if (discountTypeSelect)
		discountTypeSelect.addEventListener("change", updateDiscountLabel)

	const discountValueInput = document.getElementById("discount_value")
	if (discountValueInput)
		discountValueInput.addEventListener("input", updateSummary)

	// Customer picker (integrasi Master Pelanggan)
	initCustomerPicker()

	// Form submit
	const form = document.getElementById("createInvoiceForm")
	if (form) {
		form.addEventListener("submit", handleFormSubmit)
	}
})

// ===================== CUSTOMER PICKER =====================
// Mengisi otomatis Data Penerima dari Master Pelanggan (opsional).
function initCustomerPicker() {
	const picker = document.getElementById("customer_picker")
	if (!picker) return

	const idField = document.getElementById("customer_id")
	const nameEl = document.getElementById("recipient_name")
	const phoneEl = document.getElementById("recipient_phone")
	const npwpEl = document.getElementById("recipient_npwp")
	const addressEl = document.getElementById("recipient_address")

	picker.addEventListener("change", () => {
		const opt = picker.options[picker.selectedIndex]
		if (idField) idField.value = opt ? opt.value || "" : ""

		// Pilihan kosong = isi manual, jangan timpa apa pun
		if (!opt || !opt.value) return

		if (nameEl) nameEl.value = opt.dataset.name || ""
		if (phoneEl) phoneEl.value = opt.dataset.phone || ""
		if (npwpEl) npwpEl.value = opt.dataset.npwp || ""
		if (addressEl) addressEl.value = opt.dataset.address || ""
	})
}

// ===================== DOC TYPE TOGGLE =====================

function toggleDocType() {
	const isQuotation =
		document.getElementById("type_quotation") &&
		document.getElementById("type_quotation").checked
	const notice = document.getElementById("docTypeNotice")
	const heading = document.getElementById("docTypeHeading")
	const submitBtn = document.getElementById("submitBtn")
	const statusGroup = document.getElementById("status")
	const statusQuotationGroup = document.getElementById("statusQuotationGroup")
	const dueDateLabel = document.getElementById("dueDateLabel")

	if (isQuotation) {
		if (notice) notice.style.display = "block"
		if (heading) heading.textContent = "Informasi Penawaran Harga"
		if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Simpan Penawaran'
		if (statusGroup) statusGroup.closest(".form-group").style.display = "none"
		if (statusQuotationGroup) statusQuotationGroup.style.display = "flex"
		if (dueDateLabel) dueDateLabel.textContent = "Berlaku Hingga"

		// Update placeholder nomor
		const invNo = document.getElementById("invoice_number")
		if (invNo && (!invNo.value || invNo.value.startsWith("INV")))
			invNo.placeholder = "QT/RESPRO/001/11.2026"
	} else {
		if (notice) notice.style.display = "none"
		if (heading) heading.textContent = "Informasi Invoice"
		if (submitBtn) submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Simpan Invoice'
		if (statusGroup) statusGroup.closest(".form-group").style.display = "flex"
		if (statusQuotationGroup) statusQuotationGroup.style.display = "none"
		if (dueDateLabel) dueDateLabel.textContent = "Tanggal Jatuh Tempo"

		const invNo = document.getElementById("invoice_number")
		if (invNo) invNo.placeholder = "INV/RESPRO/001/11.2026"
	}
}

// ===================== HELPERS =====================

function parseCurrency(str) {
	if (!str) return 0
	let cleaned = str.replace(/Rp\s?/i, "").trim()
	cleaned = cleaned.replace(/\./g, "")
	cleaned = cleaned.replace(",", ".")
	return parseFloat(cleaned) || 0
}

function escapeHtml(text) {
	const map = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#039;",
	}
	return String(text || "").replace(/[&<>"']/g, (m) => map[m])
}

function formatRupiah(num) {
	return "Rp " + Math.round(num || 0).toLocaleString("id-ID")
}

// ===================== GROUP MANAGEMENT =====================

let groupCounter = 0

function addGroup() {
	const container = document.getElementById("itemsContainer")
	if (!container) return

	groupCounter++
	const groupId = "group_" + groupCounter

	const groupDiv = document.createElement("div")
	groupDiv.className = "group-container"
	groupDiv.dataset.groupId = groupId

	groupDiv.innerHTML = `
    <div class="group-header">
      <span style="font-size:0.8rem; opacity:0.75; white-space:nowrap;">Nama Group:</span>
      <input 
        type="text" 
        class="group-name-input" 
        placeholder="Contoh: I. Musik" 
        onchange="updateItems()"
        oninput="updateItems()"
      >
      <button type="button" class="btn-copy-group" onclick="copyGroup(this)"><i class="fa-solid fa-copy"></i> Copy Group</button>
      <button type="button" class="btn-remove-group" onclick="removeGroup(this)"><i class="fa-solid fa-trash"></i> Hapus Group</button>
    </div>
    <div class="group-items-container" id="${groupId}_items"></div>
    <div style="padding: 0.4rem 0 0.4rem 0.5rem;">
      <button type="button" class="btn-add" onclick="addItem('${groupId}')">+ Tambah Item</button>
    </div>
  `

	container.appendChild(groupDiv)
	addItem(groupId) // Auto add first item
	updateItems()
}

function removeGroup(btn) {
	const groupDiv = btn.closest(".group-container")
	if (groupDiv) {
		groupDiv.remove()
		updateItems()
		updateSummary()
	}
}

function copyGroup(btn) {
	const sourceGroup = btn.closest(".group-container")
	if (!sourceGroup) return

	groupCounter++
	const newGroupId = "group_" + groupCounter

	const newGroupDiv = document.createElement("div")
	newGroupDiv.className = "group-container"
	newGroupDiv.dataset.groupId = newGroupId

	// Copy group name + " (copy)"
	const srcName =
		sourceGroup.querySelector(".group-name-input").value || "Grup Baru"

	newGroupDiv.innerHTML = `
    <div class="group-header">
      <span style="font-size:0.8rem; opacity:0.75; white-space:nowrap;">Nama Group:</span>
      <input 
        type="text" 
        class="group-name-input" 
        value="${escapeHtml(srcName)} (copy)"
        onchange="updateItems()"
        oninput="updateItems()"
      >
      <button type="button" class="btn-copy-group" onclick="copyGroup(this)"><i class="fa-solid fa-copy"></i> Copy Group</button>
      <button type="button" class="btn-remove-group" onclick="removeGroup(this)"><i class="fa-solid fa-trash"></i> Hapus Group</button>
    </div>
    <div class="group-items-container" id="${newGroupId}_items"></div>
    <div style="padding: 0.4rem 0 0.4rem 0.5rem;">
      <button type="button" class="btn-add" onclick="addItem('${newGroupId}')">+ Tambah Item</button>
    </div>
  `

	// Copy items from source
	const srcItems = sourceGroup.querySelectorAll(".item-row")
	const newItemsContainer = newGroupDiv.querySelector(
		`#${newGroupId}_items`,
	)

	srcItems.forEach((srcRow) => {
		const descVal = srcRow.querySelector(".item-description")
			? srcRow.querySelector(".item-description").value
			: ""
		const unitVal = srcRow.querySelector(".item-unit")
			? srcRow.querySelector(".item-unit").value
			: ""
		const qtyVal = srcRow.querySelector(".item-qty")
			? srcRow.querySelector(".item-qty").value
			: ""
		const priceVal = srcRow.querySelector(".item-price")
			? srcRow.querySelector(".item-price").value
			: ""
		const priceType = srcRow.querySelector(".item-price-type")
			? srcRow.querySelector(".item-price-type").value
			: "unit"

		const newRow = createItemRow(
			descVal,
			unitVal,
			qtyVal,
			priceVal,
			priceType,
		)
		newItemsContainer.appendChild(newRow)
		attachItemListeners(newRow)
	})

	// If no items copied, add one empty
	if (srcItems.length === 0) {
		const emptyRow = createItemRow("", "", "", "", "unit")
		newItemsContainer.appendChild(emptyRow)
		attachItemListeners(emptyRow)
	}

	sourceGroup.after(newGroupDiv)
	updateItems()
	updateSummary()
}

// ===================== ITEM MANAGEMENT =====================

function addItem(groupId) {
	let container

	if (groupId) {
		container = document.getElementById(groupId + "_items")
		if (!container) {
			// Try finding by data-group-id
			const groupDiv = document.querySelector(
				`[data-group-id="${groupId}"]`,
			)
			if (groupDiv) container = groupDiv.querySelector(".group-items-container")
		}
	} else {
		container = document.getElementById("itemsContainer")
	}

	if (!container) return

	const row = createItemRow("", "", "", "", "unit")
	container.appendChild(row)
	attachItemListeners(row)
	updateItems()
}

function createItemRow(desc, unit, qty, price, priceType) {
	const row = document.createElement("div")
	row.className = "item-row"
	row.innerHTML = `
    <input type="text" placeholder="Deskripsi item" class="item-description" value="${escapeHtml(desc)}" onpaste="handleItemPaste(event)">
    <input type="text" placeholder="Satuan" class="item-unit" value="${escapeHtml(unit)}">
    <input type="number" placeholder="Qty" class="item-qty" value="${escapeHtml(qty)}" min="0" step="0.01" oninput="updateItemTotal(this)">
    <div class="item-price-container">
      <select class="item-price-type" onchange="togglePriceInput(this)">
        <option value="unit" ${priceType === "unit" ? "selected" : ""}>Satuan</option>
        <option value="total" ${priceType === "total" ? "selected" : ""}>Total</option>
      </select>
      <input type="number" placeholder="Harga" class="item-price" value="${escapeHtml(price)}" min="0" step="0.01" oninput="updateItemTotal(this)">
    </div>
    <div class="item-total">${qty && price ? formatRupiah(parseFloat(qty) * parseFloat(price)) : "Rp 0"}</div>
    <button type="button" class="btn-remove" onclick="removeItem(this)" title="Hapus item"><i class="fa-solid fa-xmark"></i></button>
  `
	return row
}

function attachItemListeners(row) {
	row.addEventListener("change", () => {
		updateItems()
		updateSummary()
	})
	row.addEventListener("input", () => {
		updateItems()
		updateSummary()
	})
}

function removeItem(btn) {
	const row = btn.closest(".item-row")
	if (row) {
		row.remove()
		updateItems()
		updateSummary()
	}
}

// ===================== PASTE HANDLER =====================

function handleItemPaste(event) {
	event.preventDefault()
	const clipboardData = event.clipboardData || window.clipboardData
	const pastedText = clipboardData.getData("text")
	if (!pastedText) return

	let rows = pastedText
		.trim()
		.split(/\r?\n/)
		.filter((r) => r.trim())
	if (rows.length === 0) return

	const currentRow = event.target.closest(".item-row")
	const container = currentRow ? currentRow.parentElement : null
	if (!container) return

	// Find target column
	const targetClass = event.target.className
	let columnIndex = 0
	if (targetClass.includes("item-description")) columnIndex = 0
	else if (targetClass.includes("item-unit")) columnIndex = 1
	else if (targetClass.includes("item-qty")) columnIndex = 2
	else if (targetClass.includes("item-price")) columnIndex = 3

	// Remove current row if empty
	if (currentRow) {
		const inputs = currentRow.querySelectorAll("input")
		const isEmpty = Array.from(inputs).every((i) => !i.value)
		if (isEmpty) currentRow.remove()
	}

	rows.forEach((rowText) => {
		rowText = rowText.trim()
		if (!rowText) return

		let cells = rowText.split("\t").map((c) => c.trim())
		if (cells.length === 1) {
			cells = ["", "", "", ""]
			cells[columnIndex] = rowText
		}

		const name = cells[0] || ""
		const unit = cells[1] || ""
		const qty = cells[2] || ""
		const price = cells[3] || ""

		const cleanQty = qty ? parseFloat(qty.replace(/[^\d.,]/g, "").replace(",", ".")) || 0 : 0
		const numPrice = price ? parseCurrency(price) : 0

		const newRow = createItemRow(name, unit, cleanQty || "", numPrice || "", "unit")
		container.appendChild(newRow)
		attachItemListeners(newRow)
	})

	updateItems()
	updateSummary()
}

// ===================== ITEM TOTAL =====================

function updateItemTotal(input) {
	const row = input.closest(".item-row")
	if (!row) return
	const qtyInput = row.querySelector(".item-qty")
	const priceInput = row.querySelector(".item-price")
	const priceTypeSelect = row.querySelector(".item-price-type")
	const totalSpan = row.querySelector(".item-total")

	const qty = parseFloat(qtyInput.value) || 0
	const price = parseFloat(priceInput.value) || 0
	const priceType = priceTypeSelect.value

	let total = priceType === "unit" ? qty * price : price
	totalSpan.textContent = formatRupiah(total)
	updateItems()
	updateSummary()
}

function togglePriceInput(select) {
	const row = select.closest(".item-row")
	const priceInput = row.querySelector(".item-price")
	priceInput.placeholder = select.value === "unit" ? "Harga Satuan" : "Harga Total"
	updateItemTotal(priceInput)
}

// ===================== BUILD ITEMS DATA =====================

function updateItems() {
	const container = document.getElementById("itemsContainer")
	const result = []

	// Iterate through direct children of container
	container.childNodes.forEach((node) => {
		if (!node.classList) return

		if (node.classList.contains("group-container")) {
			// It's a group
			const groupNameInput = node.querySelector(".group-name-input")
			const groupName = groupNameInput ? groupNameInput.value.trim() : ""
			const groupItems = []

			node.querySelectorAll(".item-row").forEach((row) => {
				const itemData = extractItemData(row)
				if (itemData) groupItems.push(itemData)
			})

			result.push({
				is_group: true,
				group_name: groupName,
				items: groupItems,
			})
		} else if (node.classList.contains("item-row")) {
			// It's a flat item
			const itemData = extractItemData(node)
			if (itemData) result.push(itemData)
		}
	})

	document.getElementById("items").value = JSON.stringify(result)
}

function extractItemData(row) {
	const description = row.querySelector(".item-description")
		? row.querySelector(".item-description").value
		: ""
	const unit = row.querySelector(".item-unit")
		? row.querySelector(".item-unit").value
		: ""
	const quantity =
		parseFloat(row.querySelector(".item-qty") ? row.querySelector(".item-qty").value : 0) || 0
	const priceInput =
		parseFloat(row.querySelector(".item-price") ? row.querySelector(".item-price").value : 0) || 0
	const priceType = row.querySelector(".item-price-type")
		? row.querySelector(".item-price-type").value
		: "unit"

	if (!description) return null

	let price = priceType === "total" && quantity > 0 ? priceInput / quantity : priceInput

	return { description, unit, quantity, price }
}

// ===================== CALCULATE TOTALS =====================

function calculateSubtotal(items) {
	let total = 0
	for (const item of items || []) {
		if (item.is_group) {
			for (const sub of item.items || []) {
				total += (sub.quantity || 0) * (sub.price || 0)
			}
		} else {
			total += (item.quantity || 0) * (item.price || 0)
		}
	}
	return total
}

// ===================== SUMMARY =====================

function updateSummary() {
	updateItems()
	const items = JSON.parse(document.getElementById("items").value || "[]")
	const subtotal = calculateSubtotal(items)

	// Discount
	const discountType = document.getElementById("discount_type").value
	const discountValue =
		parseFloat(document.getElementById("discount_value").value) || 0
	let discountAmount = 0
	if (discountType === "percentage") discountAmount = (subtotal * discountValue) / 100
	else if (discountType === "nominal") discountAmount = discountValue

	const subtotalAfterDiscount = subtotal - discountAmount

	// Taxes
	const taxContainer = document.getElementById("taxesContainer")
	let totalTax = 0
	taxContainer.querySelectorAll(".tax-row").forEach((row) => {
		const pct = parseFloat(row.querySelector(".tax-percentage").value) || 0
		totalTax += (subtotalAfterDiscount * pct) / 100
	})

	const totalFinal = subtotalAfterDiscount + totalTax

	const summarySection = document.getElementById("summarySection")
	if (!summarySection) return

	let html = `
    <div class="summary-item">
      <span>Subtotal:</span>
      <strong>${formatRupiah(subtotal)}</strong>
    </div>
  `

	if (discountAmount > 0) {
		html += `
      <div class="summary-item discount">
        <span>Diskon (${discountType === "percentage" ? discountValue + "%" : "Nominal"}):</span>
        <strong>− ${formatRupiah(discountAmount)}</strong>
      </div>
    `
	}

	if (totalTax > 0) {
		html += `
      <div class="summary-item">
        <span>Pajak/Biaya:</span>
        <strong>+ ${formatRupiah(totalTax)}</strong>
      </div>
    `
	}

	html += `
    <div class="summary-item total">
      <span>Total:</span>
      <strong>${formatRupiah(totalFinal)}</strong>
    </div>
  `

	summarySection.innerHTML = html
}

// ===================== DISCOUNT =====================

function updateDiscountLabel() {
	const type = document.getElementById("discount_type").value
	const label = document.getElementById("discountLabel")
	const input = document.getElementById("discount_value")

	if (type === "percentage") {
		label.textContent = "Nilai Diskon (%)"
		input.placeholder = "Misal: 10 untuk 10%"
		input.step = "0.01"
	} else if (type === "nominal") {
		label.textContent = "Nilai Diskon (Rp)"
		input.placeholder = "Misal: 50000"
		input.step = "1"
	} else {
		label.textContent = "Nilai Diskon"
		input.value = 0
	}

	updateSummary()
}

// ===================== TAXES =====================

function addTax() {
	const container = document.getElementById("taxesContainer")
	if (!container) return

	const row = document.createElement("div")
	row.className = "tax-row"
	row.innerHTML = `
    <input type="text" placeholder="Nama pajak/biaya (mis: PPN)" class="tax-name">
    <input type="number" placeholder="Persentase %" class="tax-percentage" value="" min="0" max="100" step="0.01">
    <button type="button" class="btn-remove" onclick="this.parentElement.remove(); updateTaxes();" title="Hapus"><i class="fa-solid fa-xmark"></i></button>
  `

	container.appendChild(row)
	row.addEventListener("change", updateTaxes)
	row.addEventListener("input", updateTaxes)
}

function updateTaxes() {
	const container = document.getElementById("taxesContainer")
	const taxes = []

	container.querySelectorAll(".tax-row").forEach((row) => {
		const name = row.querySelector(".tax-name").value
		const percentage = parseFloat(row.querySelector(".tax-percentage").value) || 0
		if (name && percentage) taxes.push({ name, percentage })
	})

	document.getElementById("taxes").value = JSON.stringify(taxes)
	updateSummary()
}

// ===================== FORM SUBMIT =====================

async function handleFormSubmit(e) {
	e.preventDefault()
	updateItems()
	updateTaxes()

	const form = e.target
	const isQuotation = form.querySelector('[name="document_type"]:checked')
		? form.querySelector('[name="document_type"]:checked').value === "quotation"
		: false

	// Get status from correct select
	let status = "draft"
	if (isQuotation) {
		const sq = form.querySelector('[name="status_quotation"]')
		status = sq ? sq.value : "draft"
	} else {
		const si = form.querySelector('[name="status"]')
		status = si ? si.value : "draft"
	}

	const formData = {
		company_id: form.querySelector('[name="company_id"]').value,
		document_type: isQuotation ? "quotation" : "invoice",
		invoice_number: form.querySelector('[name="invoice_number"]').value,
		status: status,
		invoice_date: form.querySelector('[name="invoice_date"]').value,
		due_date: form.querySelector('[name="due_date"]').value,
		recipient_name: form.querySelector('[name="recipient_name"]').value,
		recipient_phone: form.querySelector('[name="recipient_phone"]').value,
		recipient_npwp: form.querySelector('[name="recipient_npwp"]').value,
		recipient_address: form.querySelector('[name="recipient_address"]').value,
		customer_id: form.querySelector('[name="customer_id"]')
			? form.querySelector('[name="customer_id"]').value
			: "",
		items: form.querySelector('[name="items"]').value,
		taxes: form.querySelector('[name="taxes"]').value,
		discount_type: form.querySelector('[name="discount_type"]').value,
		discount_value:
			parseFloat(form.querySelector('[name="discount_value"]').value) || 0,
	}

	const submitBtn = document.getElementById("submitBtn")
	if (submitBtn) {
		submitBtn.disabled = true
		submitBtn.textContent = "Menyimpan..."
	}

	try {
		const response = await fetch("/admin/invoice/create", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(formData),
		})

		const result = await response.json()

		if (result.success) {
			window.location.href = `/admin/invoice/${result.id}`
		} else {
			alert("Error: " + (result.error || "Terjadi kesalahan"))
			if (submitBtn) {
				submitBtn.disabled = false
				submitBtn.innerHTML = isQuotation
					? '<i class="fa-solid fa-floppy-disk"></i> Simpan Penawaran'
					: '<i class="fa-solid fa-floppy-disk"></i> Simpan Invoice'
			}
		}
	} catch (error) {
		console.error("Submit error:", error)
		alert("Error: " + error.message)
		if (submitBtn) {
			submitBtn.disabled = false
			submitBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Simpan'
		}
	}
}
