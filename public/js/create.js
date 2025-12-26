document.addEventListener("DOMContentLoaded", () => {
	// Initialize with one empty row
	addItem()

	// Handle form submission
	document.getElementById("invoiceForm").addEventListener("submit", (e) => {
		e.preventDefault()
		const form = new FormData(e.target)
		const data = Object.fromEntries(form.entries())

		const items = Array.from(document.querySelectorAll("#items tr")).map(
			(row) => {
				const inputs = row.querySelectorAll("input")
				const name = inputs[0].value
				const qty = +inputs[1].value
				const unit = inputs[2].value
				const price = +inputs[3].value
				return { name, qty, unit, unit_price: price }
			},
		)

		const taxes = Array.from(document.querySelectorAll("#taxes tr")).map(
			(row) => {
				const inputs = row.querySelectorAll("input")
				const name = inputs[0].value
				const percent = +inputs[1].value
				return { name, percent }
			},
		)

		// Get discount info
		const discountType = document.getElementById("discountType").value
		const discountValue =
			parseFloat(document.getElementById("discountValue").value) || 0

		data.items = items
		data.taxes = taxes
		data.discount_type = discountType
		data.discount_value = discountValue

		fetch("/admin/invoice/create", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		})
			.then((res) => res.json())
			.then((res) => {
				if (res.success) location.href = `/admin/invoice/${res.id}`
			})
	})

	// Handle paste event untuk multi-row input
	const itemsTable = document.getElementById("items")
	itemsTable.addEventListener("paste", handlePaste)
})

// Parse currency string to number (e.g., "Rp 50.000" -> 50000)
function parseCurrency(str) {
	if (!str) return 0
	// Remove "Rp" and spaces
	let cleaned = str.replace(/Rp\s?/i, "").trim()
	// Remove dots (thousand separator in Indonesia)
	cleaned = cleaned.replace(/\./g, "")
	// Replace comma with dot if it exists
	cleaned = cleaned.replace(",", ".")
	return parseFloat(cleaned) || 0
}

// Handle paste event untuk copy-paste dari Excel/Spreadsheet
function handlePaste(e) {
	e.preventDefault()
	const clipboardData = e.clipboardData || window.clipboardData
	const pastedText = clipboardData.getData("text")

	if (!pastedText) return

	// Split by newline to get rows
	let rows = pastedText.trim().split("\n")

	// Clear existing items if only one empty row exists
	const itemRows = document.querySelectorAll("#items tr")
	if (itemRows.length === 1) {
		const inputs = itemRows[0].querySelectorAll("input")
		const isEmpty = Array.from(inputs).every((i) => !i.value)
		if (isEmpty) {
			itemRows[0].remove()
		}
	}

	// Parse each row
	rows.forEach((rowText) => {
		rowText = rowText.trim()
		if (!rowText) return // Skip empty rows

		// Try to split by tab first (spreadsheet format)
		let cells = rowText.split("\t").map((c) => c.trim())

		// If only 1 cell, treat the whole row as item name
		if (cells.length === 1) {
			// Single cell - assume it's just the item name
			cells = [cells[0]] // name only
		}

		// Only create row if we have at least a name
		if (cells[0]) {
			const [name, qty, unit, price] = [
				cells[0] || "",
				cells[1] || "",
				cells[2] || "",
				cells[3] || "",
			]

			const row = document.createElement("tr")
			row.style.borderBottom = "1px solid #ddd"
			const numQty = qty ? parseInt(qty) : 0
			const numPrice = price ? parseCurrency(price) : 0
			const total = numQty * numPrice

			row.innerHTML = `
        <td style="padding: 0.75rem; border: 1px solid #ddd;"><input type="text" value="${escapeHtml(
					name,
				)}" required style="width: 100%; padding: 0.5rem; border: none; font-size: 0.9rem;"></td>
        <td style="padding: 0.75rem; border: 1px solid #ddd; text-align: center;"><input type="number" value="${numQty}" required oninput="updateItemTotal(this)" style="width: 100%; padding: 0.5rem; border: none; text-align: center; font-size: 0.9rem;"></td>
        <td style="padding: 0.75rem; border: 1px solid #ddd; text-align: center;"><input type="text" value="${escapeHtml(
					unit,
				)}" required style="width: 100%; padding: 0.5rem; border: none; text-align: center; font-size: 0.9rem;"></td>
        <td style="padding: 0.75rem; border: 1px solid #ddd; text-align: right;"><input type="number" value="${numPrice}" required oninput="updateItemTotal(this)" step="0.01" style="width: 100%; padding: 0.5rem; border: none; text-align: right; font-size: 0.9rem;"></td>
        <td style="padding: 0.75rem; border: 1px solid #ddd; text-align: right;"><span class="item-total" style="font-weight: 600; color: #333;">${total.toLocaleString(
					"id-ID",
				)}</span></td>
        <td style="padding: 0.75rem; border: 1px solid #ddd; text-align: center;"><button type="button" class="btn-remove" onclick="this.closest('tr').remove()" style="background: #dc3545; color: white; padding: 0.35rem 0.75rem; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">Hapus</button></td>
      `
			document.getElementById("items").appendChild(row)
		}
	})
}

// Update total harga per item secara realtime
function updateItemTotal(input) {
	const row = input.closest("tr")
	const qtyInput = row.querySelector('input[type="number"]:nth-of-type(1)')
	const priceInput = row.querySelector('input[type="number"]:nth-of-type(2)')

	const qty = parseFloat(qtyInput.value) || 0
	const price = parseFloat(priceInput.value) || 0
	const total = qty * price

	row.querySelector(".item-total").textContent = total.toLocaleString("id-ID")
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

function addItem() {
	const row = document.createElement("tr")
	row.style.borderBottom = "1px solid #ddd"
	row.innerHTML = `
    <td style="padding: 0.75rem; border: 1px solid #ddd;"><input type="text" placeholder="Nama barang/jasa" required style="width: 100%; padding: 0.5rem; border: none; font-size: 0.9rem;"></td>
    <td style="padding: 0.75rem; border: 1px solid #ddd; text-align: center;"><input type="number" placeholder="0" required oninput="updateItemTotal(this)" style="width: 100%; padding: 0.5rem; border: none; text-align: center; font-size: 0.9rem;"></td>
    <td style="padding: 0.75rem; border: 1px solid #ddd; text-align: center;"><input type="text" placeholder="unit" required style="width: 100%; padding: 0.5rem; border: none; text-align: center; font-size: 0.9rem;"></td>
    <td style="padding: 0.75rem; border: 1px solid #ddd; text-align: right;"><input type="number" placeholder="0" required oninput="updateItemTotal(this)" step="0.01" style="width: 100%; padding: 0.5rem; border: none; text-align: right; font-size: 0.9rem;"></td>
    <td style="padding: 0.75rem; border: 1px solid #ddd; text-align: right;"><span class="item-total" style="font-weight: 600; color: #333;">0</span></td>
    <td style="padding: 0.75rem; border: 1px solid #ddd; text-align: center;"><button type="button" class="btn-remove" onclick="this.closest('tr').remove()" style="background: #dc3545; color: white; padding: 0.35rem 0.75rem; border: none; border-radius: 4px; cursor: pointer; font-size: 0.85rem;">Hapus</button></td>
  `
	document.getElementById("items").appendChild(row)
}

function addTax() {
	const row = document.createElement("tr")
	row.innerHTML = `
    <td><input type="text" required></td>
    <td><input type="number" required step="0.01"></td>
    <td><button type="button" class="btn-remove" onclick="this.closest('tr').remove()">Hapus</button></td>
  `
	document.getElementById("taxes").appendChild(row)
}

// Handle discount type change
function handleDiscountTypeChange() {
	const type = document.getElementById("discountType").value
	const label = document.getElementById("discountLabel")
	const input = document.getElementById("discountValue")

	if (type === "percentage") {
		label.textContent = "Diskon (%):"
		input.placeholder = "Misal: 10 untuk 10%"
		input.step = "0.01"
	} else {
		label.textContent = "Diskon (Rp):"
		input.placeholder = "Misal: 50000"
		input.step = "1"
	}
}
