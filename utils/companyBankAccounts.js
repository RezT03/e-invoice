const db = require("../db/connection")

const ACCOUNT_COLUMNS =
	"id, company_id, bank_name, account_number, account_name, is_default"

async function getAccountsByCompany(companyId) {
	if (!companyId) return []
	const [rows] = await db.execute(
		`SELECT ${ACCOUNT_COLUMNS} FROM company_bank_accounts
		 WHERE company_id = ? ORDER BY is_default DESC, id ASC`,
		[companyId],
	)
	return rows
}

function parseSelectedIds(value) {
	if (Array.isArray(value)) {
		return value.map(Number).filter(Number.isInteger)
	}
	if (typeof value === "string") {
		try {
			const parsed = JSON.parse(value)
			return Array.isArray(parsed)
				? parsed.map(Number).filter(Number.isInteger)
				: []
		} catch (err) {
			return []
		}
	}
	return []
}

async function getAccountsByIds(companyId, ids) {
	const safeIds = (Array.isArray(ids) ? ids : [])
		.map(Number)
		.filter(Number.isInteger)
		.slice(0, 50)
	if (!safeIds.length || !companyId) return []

	const placeholders = safeIds.map(() => "?").join(",")
	const [rows] = await db.execute(
		`SELECT ${ACCOUNT_COLUMNS} FROM company_bank_accounts
		 WHERE company_id = ? AND id IN (${placeholders})
		 ORDER BY is_default DESC, id ASC`,
		[companyId, ...safeIds],
	)
	return rows
}

// Dipakai sebelum generatePDF: menerjemahkan opsi tersimpan menjadi daftar rekening.
async function attachPdfOptions(invoice) {
	if (!invoice) return invoice

	const showBank = Number(invoice.pdf_show_bank) === 1
	const showPaidNotice = Number(invoice.pdf_show_paid_notice) === 1
	const selectedIds = showBank
		? parseSelectedIds(invoice.pdf_bank_account_ids)
		: []

	invoice.pdfOptions = {
		showBank,
		showPaidNotice,
		accounts: await getAccountsByIds(invoice.company_id, selectedIds),
	}
	return invoice
}

module.exports = {
	getAccountsByCompany,
	getAccountsByIds,
	parseSelectedIds,
	attachPdfOptions,
}
