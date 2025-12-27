// Invoice Detail Page Scripts

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
})

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
