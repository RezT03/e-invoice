// Create Invoice Page Scripts

document.addEventListener("DOMContentLoaded", function () {
	// Set default date to today
	const invoiceDateInput = document.getElementById("invoice_date")
	if (invoiceDateInput) {
		invoiceDateInput.valueAsDate = new Date()
	}

	// Add first item by default
	addItem()

	// Add event listener untuk diskon
	const discountTypeSelect = document.getElementById("discount_type")
	if (discountTypeSelect) {
		discountTypeSelect.addEventListener("change", updateDiscountLabel)
	}

	const discountValueInput = document.getElementById("discount_value")
	if (discountValueInput) {
		discountValueInput.addEventListener("input", updateSummary)
	}
})

// Parse currency string to number (e.g., "Rp 50.000" -> 50000)
function parseCurrency(str) {
	if (!str) return 0
	let cleaned = str.replace(/Rp\s?/i, "").trim()
	cleaned = cleaned.replace(/\./g, "")
	cleaned = cleaned.replace(",", ".")
	return parseFloat(cleaned) || 0
}

// Escape HTML untuk prevent XSS
function escapeHtml(text) {
	const map = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#039;",
	}
	return text.replace(/[&<>"']/g, (m) => map[m])
}

// Items management
function addItem() {
	const container = document.getElementById("itemsContainer")
	if (!container) return

	const row = document.createElement("div")
	row.className = "item-row"
	row.innerHTML = `
        <input type="text" placeholder="Deskripsi item" class="item-description" onpaste="handleItemPaste(event)">
        <input type="text" placeholder="Satuan" class="item-unit" onpaste="handleItemPaste(event)">
        <input type="number" placeholder="Qty" class="item-qty" value="" min="0" step="0.01" oninput="updateItemTotal(this)" onpaste="handleItemPaste(event)">
        <div class="item-price-container">
        	<select class="item-price-type" onchange="togglePriceInput(this)">
        		<option value="unit">Harga Satuan</option>
        		<option value="total">Harga Total</option>
        	</select>
        	<input type="number" placeholder="Harga" class="item-price" value="" min="0" step="0.01" oninput="updateItemTotal(this)" onpaste="handleItemPaste(event)">
        </div>
        <div class="item-total">0</div>
        <button type="button" class="btn-remove" onclick="this.parentElement.remove(); updateItems();">Hapus</button>
    `

	container.appendChild(row)
	row.addEventListener("change", updateItems)
	row.addEventListener("input", updateItems)
}

// Handle paste event untuk multi-row items
function handleItemPaste(event) {
	event.preventDefault()
	const clipboardData = event.clipboardData || window.clipboardData
	const pastedText = clipboardData.getData("text")

	if (!pastedText) return

	// Split by newline (handle both \n and \r\n)
	let rows = pastedText
		.trim()
		.split(/\r?\n/)
		.filter((r) => r.trim())

	// If no rows, return
	if (rows.length === 0) return

	// Get current container
	const container = document.getElementById("itemsContainer")
	const currentRow = event.target.closest(".item-row")

	// Determine which column was pasted to
	const targetClass = event.target.className
	let columnIndex = 0
	if (targetClass.includes("item-description")) columnIndex = 0
	else if (targetClass.includes("item-unit")) columnIndex = 1
	else if (targetClass.includes("item-qty")) columnIndex = 2
	else if (targetClass.includes("item-price")) columnIndex = 3

	// Remove current empty row if empty
	if (currentRow) {
		const inputs = currentRow.querySelectorAll("input")
		const isEmpty = Array.from(inputs).every((i) => !i.value)
		if (isEmpty) {
			currentRow.remove()
		}
	}

	// Parse each row
	rows.forEach((rowText, idx) => {
		rowText = rowText.trim()
		if (!rowText) return

		// Try to split by tab first
		let cells = rowText.split("\t").map((c) => c.trim())

		// If no tabs found, treat as single value for the target column
		if (cells.length === 1) {
			cells = ["", "", "", ""]
			cells[columnIndex] = rowText
		}

		const name = cells[0] || ""
		const unit = cells[1] || ""
		const qty = cells[2] || ""
		const price = cells[3] || ""

		const row = document.createElement("div")
		row.className = "item-row"

		// Parse qty - handle both plain numbers and formatted numbers (support decimal)
		let numQty = 0
		if (qty) {
			// Remove non-numeric except dot and comma
			const cleanQty = qty.replace(/[^\d.,]/g, "").replace(",", ".")
			numQty = parseFloat(cleanQty) || 0
		}

		// Parse price - handle currency format
		const numPrice = price ? parseCurrency(price) : 0
		const total = numQty * numPrice

		row.innerHTML = `
            <input type="text" value="${escapeHtml(name)}" placeholder="Deskripsi item" class="item-description">
            <input type="text" value="${escapeHtml(unit)}" placeholder="Satuan" class="item-unit">
            <input type="number" value="${numQty}" placeholder="Qty" class="item-qty" min="0" step="0.01" oninput="updateItemTotal(this)">
            <div class="item-price-container">
                <select class="item-price-type" onchange="togglePriceInput(this)">
                    <option value="unit" selected>Harga Satuan</option>
                    <option value="total">Harga Total</option>
                </select>
                <input type="number" value="${numPrice}" placeholder="Harga" class="item-price" min="0" step="0.01" oninput="updateItemTotal(this)">
            </div>
            <div class="item-total">${total.toLocaleString("id-ID")}</div>
            <button type="button" class="btn-remove" onclick="this.parentElement.remove(); updateItems();">Hapus</button>
        `

		container.appendChild(row)
		row.addEventListener("change", updateItems)
		row.addEventListener("input", updateItems)
	})

	updateItems()
}

// Update total harga per item
function updateItemTotal(input) {
	const row = input.closest(".item-row")
	const qtyInput = row.querySelector(".item-qty")
	const priceInput = row.querySelector(".item-price")
	const priceTypeSelect = row.querySelector(".item-price-type")
	const totalSpan = row.querySelector(".item-total")

	const qty = parseFloat(qtyInput.value) || 0
	const price = parseFloat(priceInput.value) || 0
	const priceType = priceTypeSelect.value // "unit" atau "total"

	let total = 0
	if (priceType === "unit") {
		// Harga satuan: total = qty * price
		total = qty * price
	} else {
		// Harga total: yang diinput sudah total, qty akan dibagi nanti saat menyimpan
		total = price
	}

	totalSpan.textContent = total.toLocaleString("id-ID")
	updateItems()
}

// Toggle antara input harga satuan atau harga total
function togglePriceInput(select) {
	const row = select.closest(".item-row")
	const priceInput = row.querySelector(".item-price")
	const priceType = select.value

	if (priceType === "unit") {
		priceInput.placeholder = "Harga Satuan"
	} else {
		priceInput.placeholder = "Harga Total"
	}

	// Trigger update untuk refresh total
	updateItemTotal(priceInput)
}

function updateItems() {
	const container = document.getElementById("itemsContainer")
	const items = []

	container.querySelectorAll(".item-row").forEach((row) => {
		const description = row.querySelector(".item-description").value
		const unit = row.querySelector(".item-unit").value
		const quantity = parseFloat(row.querySelector(".item-qty").value) || 0
		const priceInput = parseFloat(row.querySelector(".item-price").value) || 0
		const priceType = row.querySelector(".item-price-type").value

		if (description && quantity && priceInput) {
			let price = priceInput

			// Jika input adalah harga total, hitung harga satuan
			if (priceType === "total") {
				price = priceInput / quantity
			}

			items.push({ description, unit, quantity, price })
		}
	})

	document.getElementById("items").value = JSON.stringify(items)
	updateSummary()
}

// Discount management
function updateDiscountLabel() {
	const type = document.getElementById("discount_type").value
	const label = document.getElementById("discountLabel")
	const input = document.getElementById("discount_value")

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

	updateSummary()
}

// Hitung dan tampilkan ringkasan total
function updateSummary() {
	// Hitung subtotal dari items
	const container = document.getElementById("itemsContainer")
	let subtotal = 0

	container.querySelectorAll(".item-row").forEach((row) => {
		const quantity = parseFloat(row.querySelector(".item-qty").value) || 0
		const priceInput = parseFloat(row.querySelector(".item-price").value) || 0
		const priceType = row.querySelector(".item-price-type").value

		let itemTotal = 0
		if (priceType === "unit") {
			itemTotal = quantity * priceInput
		} else {
			itemTotal = priceInput // Harga total yang diinput
		}
		subtotal += itemTotal
	})

	// Hitung diskon
	const discountType = document.getElementById("discount_type").value
	const discountValue =
		parseFloat(document.getElementById("discount_value").value) || 0
	let discountAmount = 0

	if (discountType === "percentage") {
		discountAmount = (subtotal * discountValue) / 100
	} else if (discountType === "nominal") {
		discountAmount = discountValue
	}

	// Subtotal setelah diskon
	const subtotalAfterDiscount = subtotal - discountAmount

	// Hitung total pajak
	const taxContainer = document.getElementById("taxesContainer")
	let totalTax = 0

	taxContainer.querySelectorAll(".tax-row").forEach((row) => {
		const percentage =
			parseFloat(row.querySelector(".tax-percentage").value) || 0
		totalTax += (subtotalAfterDiscount * percentage) / 100
	})

	// Total akhir
	const totalFinal = subtotalAfterDiscount + totalTax

	// Update display (jika ada elemen untuk menampilkan)
	const summarySection = document.getElementById("summarySection")
	if (summarySection) {
		summarySection.innerHTML = `
            <div class="summary-item">
                <span>Subtotal:</span>
                <strong>Rp ${subtotal.toLocaleString("id-ID")}</strong>
            </div>
            ${
							discountAmount > 0
								? `
            <div class="summary-item">
                <span>Diskon (${discountType === "percentage" ? discountValue + "%" : "Nominal"}):</span>
                <strong style="color: green;">-Rp ${discountAmount.toLocaleString("id-ID")}</strong>
            </div>
            `
								: ""
						}
            <div class="summary-item">
                <span>Subtotal setelah diskon:</span>
                <strong>Rp ${subtotalAfterDiscount.toLocaleString("id-ID")}</strong>
            </div>
            ${
							totalTax > 0
								? `
            <div class="summary-item">
                <span>Pajak/Biaya:</span>
                <strong>Rp ${totalTax.toLocaleString("id-ID")}</strong>
            </div>
            `
								: ""
						}
            <div class="summary-item" style="border-top: 2px solid #ccc; padding-top: 10px; margin-top: 10px;">
                <span style="font-weight: bold;">Total:</span>
                <strong style="font-size: 18px; color: #2c3e50;">Rp ${totalFinal.toLocaleString("id-ID")}</strong>
            </div>
        `
	}
}

// Taxes management
function addTax() {
	const container = document.getElementById("taxesContainer")
	if (!container) return

	const row = document.createElement("div")
	row.className = "tax-row"
	row.innerHTML = `
        <input type="text" placeholder="Nama pajak/biaya" class="tax-name">
        <input type="number" placeholder="Persentase %" class="tax-percentage" value="" min="0" max="100" step="0.01">
        <button type="button" class="btn-remove" onclick="this.parentElement.remove(); updateTaxes();">Hapus</button>
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
		const percentage =
			parseFloat(row.querySelector(".tax-percentage").value) || 0

		if (name && percentage) {
			taxes.push({ name, percentage })
		}
	})

	document.getElementById("taxes").value = JSON.stringify(taxes)
	updateSummary()
}

// Form submit
document.addEventListener("DOMContentLoaded", function () {
	const form = document.getElementById("createInvoiceForm")
	if (!form) return

	form.addEventListener("submit", async (e) => {
		e.preventDefault()

		updateItems()
		updateTaxes()

		// Ambil data dari form dengan cara yang lebih aman
		const formElement = e.target
		const formData = {
			company_id: formElement.querySelector('[name="company_id"]').value,
			invoice_number: formElement.querySelector('[name="invoice_number"]')
				.value,
			status: formElement.querySelector('[name="status"]').value,
			invoice_date: formElement.querySelector('[name="invoice_date"]').value,
			due_date: formElement.querySelector('[name="due_date"]').value,
			recipient_name: formElement.querySelector('[name="recipient_name"]')
				.value,
			recipient_phone: formElement.querySelector('[name="recipient_phone"]')
				.value,
			recipient_npwp: formElement.querySelector('[name="recipient_npwp"]')
				.value,
			recipient_address: formElement.querySelector('[name="recipient_address"]')
				.value,
			items: formElement.querySelector('[name="items"]').value,
			taxes: formElement.querySelector('[name="taxes"]').value,
			discount_type: formElement.querySelector('[name="discount_type"]').value,
			discount_value:
				parseFloat(
					formElement.querySelector('[name="discount_value"]').value,
				) || 0,
		}

		try {
			const response = await fetch("/admin/invoice/create", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(formData),
			})

			const result = await response.json()

			if (result.success) {
				alert("Invoice berhasil dibuat!")
				window.location.href = `/admin/invoice/${result.id}`
			} else {
				alert("Error: " + (result.error || "Terjadi kesalahan"))
			}
		} catch (error) {
			console.error("Submit error:", error)
			alert("Error: " + error.message)
		}
	})
})
