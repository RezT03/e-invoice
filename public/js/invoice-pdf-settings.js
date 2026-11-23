// Pengelola rekening perusahaan dan opsi PDF Normal pada halaman detail invoice.
document.addEventListener("DOMContentLoaded", () => {
	const invoiceEl = document.querySelector("[data-invoice-id]")
	const listEl = document.getElementById("bankAccountList")
	if (!invoiceEl || !listEl) return

	const invoiceId = invoiceEl.dataset.invoiceId
	const optionsEl = document.getElementById("pdfAccountOptions")
	const showBankEl = document.getElementById("pdfShowBank")
	const showPaidEl = document.getElementById("pdfShowPaidNotice")
	const form = document.getElementById("bankAccountForm")
	const idEl = document.getElementById("bankAccountId")
	const nameEl = document.getElementById("bankName")
	const numberEl = document.getElementById("bankAccountNumber")
	const accountNameEl = document.getElementById("bankAccountName")
	const defaultEl = document.getElementById("bankAccountDefault")
	const submitEl = document.getElementById("saveBankAccount")
	const cancelEl = document.getElementById("cancelBankAccountEdit")
	const accountStatus = document.getElementById("bankAccountStatus")
	const optionsStatus = document.getElementById("pdfOptionsStatus")

	let accounts = []

	async function api(path, options = {}) {
		const response = await fetch(path, {
			headers: { "Content-Type": "application/json" },
			...options,
		})
		const data = await response
			.json()
			.catch(() => ({ success: false, error: "Respons server tidak valid" }))
		if (!response.ok || !data.success) {
			throw new Error(data.error || "Permintaan gagal")
		}
		return data
	}

	function make(tag, className, text) {
		const element = document.createElement(tag)
		if (className) element.className = className
		if (text != null) element.textContent = text
		return element
	}

	function status(element, message, isError = false) {
		if (!element) return
		element.textContent = message
		element.style.color = isError ? "#fc032d" : "var(--text-muted)"
	}

	function selectedIds() {
		return Array.from(document.querySelectorAll(".pdf-account-checkbox"))
			.filter((box) => box.checked)
			.map((box) => Number(box.value))
	}

	function renderAccountList() {
		listEl.replaceChildren()

		if (!accounts.length) {
			listEl.appendChild(
				make("div", "", "Belum ada rekening terdaftar."),
			)
			listEl.lastChild.style.cssText =
				"font-size:0.82rem;color:var(--text-muted);"
			return
		}

		accounts.forEach((account) => {
			const row = make("div")
			row.style.cssText =
				"border:1px solid #eef0f3;border-radius:6px;padding:0.6rem;margin-bottom:0.5rem;"

			const title = make("div")
			title.style.cssText = "font-size:0.85rem;font-weight:600;"
			title.textContent = account.bank_name
			if (account.is_default) {
				const badge = make("span", "badge", " Utama ")
				badge.style.cssText =
					"background:var(--primary-light);color:var(--primary);font-size:0.62rem;margin-left:0.35rem;"
				title.appendChild(badge)
			}
			row.appendChild(title)

			const detail = make(
				"div",
				"",
				`${account.account_number} · ${account.account_name || "-"}`,
			)
			detail.style.cssText = "font-size:0.8rem;color:var(--text-muted);margin-top:0.2rem;"
			row.appendChild(detail)

			const actions = make("div")
			actions.style.cssText = "display:flex;gap:0.4rem;margin-top:0.5rem;"
			const edit = make("button", "btn-small secondary", "Edit")
			edit.type = "button"
			edit.addEventListener("click", () => fillForm(account))
			const remove = make("button", "btn-small", "Hapus")
			remove.type = "button"
			remove.addEventListener("click", () => removeAccount(account))
			actions.append(edit, remove)
			row.appendChild(actions)

			listEl.appendChild(row)
		})
	}

	function renderPdfOptions(keepSelection = true) {
		if (!optionsEl) return
		const checked = keepSelection ? selectedIds() : []
		optionsEl.replaceChildren()

		if (!accounts.length) {
			optionsEl.appendChild(
				make("div", "", "Tambahkan rekening terlebih dahulu."),
			)
			optionsEl.lastChild.style.cssText =
				"font-size:0.8rem;color:var(--text-muted);padding:0.35rem 0;"
			return
		}

		accounts.forEach((account) => {
			const label = make("label")
			label.style.cssText =
				"display:flex;gap:0.5rem;align-items:flex-start;margin:0.4rem 0;font-size:0.85rem;"

			const checkbox = make("input", "pdf-account-checkbox")
			checkbox.type = "checkbox"
			checkbox.value = String(account.id)
			checkbox.checked = checked.includes(Number(account.id))
			checkbox.disabled = !showBankEl.checked

			const text = make("span")
			const strong = make("strong", "", account.bank_name)
			const small = make(
				"span",
				"",
				`${account.account_number} · ${account.account_name || "-"}`,
			)
			small.style.cssText = "display:block;color:var(--text-muted);font-size:0.78rem;"
			text.append(strong, small)
			label.append(checkbox, text)
			optionsEl.appendChild(label)
		})
	}

	function fillForm(account) {
		idEl.value = String(account.id)
		nameEl.value = account.bank_name
		numberEl.value = account.account_number
		accountNameEl.value = account.account_name || ""
		defaultEl.checked = Boolean(account.is_default)
		submitEl.textContent = "Simpan Perubahan"
		cancelEl.style.display = "inline-flex"
		status(accountStatus, "")
	}

	function resetForm() {
		form.reset()
		idEl.value = ""
		submitEl.textContent = "Tambah Rekening"
		cancelEl.style.display = "none"
	}

	async function reloadAccounts(message) {
		const checked = selectedIds()
		try {
			const data = await api(`/admin/invoice/${invoiceId}/bank-accounts`)
			accounts = data.accounts
			renderAccountList()
			renderPdfOptions(true)
			// Pulihkan pilihan yang masih valid setelah daftar diperbarui.
			document.querySelectorAll(".pdf-account-checkbox").forEach((box) => {
				box.checked = checked.includes(Number(box.value))
			})
			if (message) status(accountStatus, message)
		} catch (error) {
			status(accountStatus, error.message, true)
		}
	}

	async function removeAccount(account) {
		if (!confirm(`Hapus rekening ${account.bank_name} - ${account.account_number}?`)) return
		try {
			await api(`/admin/invoice/${invoiceId}/bank-accounts/${account.id}`, {
				method: "DELETE",
			})
			if (idEl.value === String(account.id)) resetForm()
			await reloadAccounts("Rekening dihapus.")
		} catch (error) {
			status(accountStatus, error.message, true)
		}
	}

	form.addEventListener("submit", async (event) => {
		event.preventDefault()
		const payload = {
			bank_name: nameEl.value.trim(),
			account_number: numberEl.value.trim(),
			account_name: accountNameEl.value.trim(),
			is_default: defaultEl.checked,
		}
		if (!payload.bank_name || !payload.account_number) {
			status(accountStatus, "Nama bank dan nomor rekening wajib diisi.", true)
			return
		}

		const editingId = idEl.value
		const path = editingId
			? `/admin/invoice/${invoiceId}/bank-accounts/${editingId}`
			: `/admin/invoice/${invoiceId}/bank-accounts`

		try {
			await api(path, {
				method: editingId ? "PUT" : "POST",
				body: JSON.stringify(payload),
			})
			resetForm()
			await reloadAccounts("Rekening tersimpan.")
		} catch (error) {
			status(accountStatus, error.message, true)
		}
	})

	cancelEl.addEventListener("click", resetForm)

	showBankEl?.addEventListener("change", () => {
		document.querySelectorAll(".pdf-account-checkbox").forEach((box) => {
			box.disabled = !showBankEl.checked
			if (!showBankEl.checked) box.checked = false
		})
	})

	document.getElementById("savePdfOptions")?.addEventListener("click", async () => {
		try {
			await api(`/admin/invoice/${invoiceId}/pdf-options`, {
				method: "POST",
				body: JSON.stringify({
					show_bank: showBankEl.checked,
					account_ids: selectedIds(),
					show_paid_notice: showPaidEl.checked,
				}),
			})
			status(optionsStatus, "Opsi PDF tersimpan.")
		} catch (error) {
			status(optionsStatus, error.message, true)
		}
	})

	reloadAccounts()
})
