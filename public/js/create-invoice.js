// Create Invoice Page Scripts

document.addEventListener("DOMContentLoaded", function () {
	// Set default date to today
	const invoiceDateInput = document.getElementById("invoice_date")
	if (invoiceDateInput) {
		invoiceDateInput.valueAsDate = new Date()
	}

	// Add first item by default
	addItem()
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
        <input type="text" placeholder="Satuan" class="item-unit">
        <input type="number" placeholder="Qty" class="item-qty" value="" min="1" oninput="updateItemTotal(this)">
        <input type="number" placeholder="Harga" class="item-price" value="" min="0" step="0.01" oninput="updateItemTotal(this)">
        <div class="item-total">0</div>
        <button type="button" class="btn-remove" onclick="this.parentElement.remove(); updateItems();">Hapus</button>
    `

	container.appendChild(row)
	row.addEventListener("change", updateItems)
	row.addEventListener("input", updateItems)
}

// Handle paste event untuk multi-row items
function handleItemPaste(event) {
	// Only trigger on first input
	if (event.target.classList.contains("item-qty")) return

	event.preventDefault()
	const clipboardData = event.clipboardData || window.clipboardData
	const pastedText = clipboardData.getData("text")

	if (!pastedText) return

	// Split by newline
	let rows = pastedText.trim().split("\n")

	// Get current container
	const container = document.getElementById("itemsContainer")
	const currentRow = event.target.closest(".item-row")

	// Remove current empty row if empty
	if (currentRow) {
		const inputs = currentRow.querySelectorAll("input")
		const isEmpty = Array.from(inputs).every((i) => !i.value)
		if (isEmpty) {
			currentRow.remove()
		}
	}

	// Parse each row
	rows.forEach((rowText) => {
		rowText = rowText.trim()
		if (!rowText) return

		// Try to split by tab first
		let cells = rowText.split("\t").map((c) => c.trim())

		// Single cell - treat as item name
		if (cells.length === 1) {
			cells = [cells[0]]
		}

		if (cells[0]) {
			const [name, unit, qty, price] = [
				cells[0] || "",
				cells[1] || "",
				cells[2] || "",
				cells[3] || "",
			]

			const row = document.createElement("div")
			row.className = "item-row"
			const numQty = qty ? parseInt(qty) : 0
			const numPrice = price ? parseCurrency(price) : 0
			const total = numQty * numPrice

			row.innerHTML = `
                <input type="text" value="${escapeHtml(
									name,
								)}" placeholder="Deskripsi item" class="item-description">
                <input type="text" value="${escapeHtml(
									unit,
								)}" placeholder="Satuan" class="item-unit">
                <input type="number" value="${numQty}" placeholder="Qty" class="item-qty" min="1" oninput="updateItemTotal(this)">
                <input type="number" value="${numPrice}" placeholder="Harga" class="item-price" min="0" step="0.01" oninput="updateItemTotal(this)">
                <div class="item-total">${total.toLocaleString("id-ID")}</div>
                <button type="button" class="btn-remove" onclick="this.parentElement.remove(); updateItems();">Hapus</button>
            `

			container.appendChild(row)
			row.addEventListener("change", updateItems)
			row.addEventListener("input", updateItems)
		}
	})

	updateItems()
}

// Update total harga per item
function updateItemTotal(input) {
	const row = input.closest(".item-row")
	const qtyInput = row.querySelector(".item-qty")
	const priceInput = row.querySelector(".item-price")
	const totalSpan = row.querySelector(".item-total")

	const qty = parseFloat(qtyInput.value) || 0
	const price = parseFloat(priceInput.value) || 0
	const total = qty * price

	totalSpan.textContent = total.toLocaleString("id-ID")
	updateItems()
}

function updateItems() {
	const container = document.getElementById("itemsContainer")
	const items = []

	container.querySelectorAll(".item-row").forEach((row) => {
		const description = row.querySelector(".item-description").value
		const unit = row.querySelector(".item-unit").value
		const quantity = parseFloat(row.querySelector(".item-qty").value) || 0
		const price = parseFloat(row.querySelector(".item-price").value) || 0

		if (description && quantity && price) {
			items.push({ description, unit, quantity, price })
		}
	})

	document.getElementById("items").value = JSON.stringify(items)
}

// Discount management
function updateDiscountLabel() {
	const type = document.getElementById("discount_type").value
	const label = document.getElementById("discountLabel")
	const input = document.getElementById("discount_value")
	const info = document.getElementById("discountInfo")

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
		info.style.display = "none"
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
        <input type="number" placeholder="Persentase %" class="tax-percentage" value="0" min="0" max="100" step="0.01">
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
