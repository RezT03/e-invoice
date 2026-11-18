// Sinkronisasi Google Calendar memakai Service Account (tanpa OAuth).
//
// Cara kerja: kalender bersama dibagikan ke email service account dengan
// permission "Make changes to events", lalu aplikasi menulis event ke kalender
// tersebut. Tidak ada login user maupun refresh token.
//
// Konfigurasi lewat .env (lihat .env.example):
//   GOOGLE_CALENDAR_ID
//   GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY   (key sebagai teks)
//   atau GOOGLE_SERVICE_ACCOUNT_JSON                    (path file atau JSON mentah)

const fs = require("fs")

const SCOPES = ["https://www.googleapis.com/auth/calendar"]
const TIMEZONE = process.env.CALENDAR_TIMEZONE || "Asia/Jakarta"

let cachedCalendar = null
let loadError = null

// Ambil kredensial service account dari environment. Return null jika belum diisi.
function getCredentials() {
	// Opsi A: satu variabel JSON (path file atau JSON mentah)
	const rawJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
	if (rawJson && rawJson.trim()) {
		const value = rawJson.trim()
		try {
			if (value.startsWith("{")) {
				return JSON.parse(value)
			}
			// dianggap path file
			return JSON.parse(fs.readFileSync(value, "utf8"))
		} catch (err) {
			loadError = `Gagal membaca GOOGLE_SERVICE_ACCOUNT_JSON: ${err.message}`
			return null
		}
	}

	// Opsi B: email + private key terpisah
	const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
	const key = process.env.GOOGLE_PRIVATE_KEY
	if (email && key) {
		return {
			client_email: email,
			// Private key di .env biasanya berisi "\n" literal
			private_key: key.replace(/\\n/g, "\n"),
		}
	}

	return null
}

function getCalendarId() {
	return process.env.GOOGLE_CALENDAR_ID || ""
}

// Apakah integrasi siap dipakai?
function isConfigured() {
	return Boolean(getCredentials() && getCalendarId())
}

// Buat client Calendar (di-cache). Return null jika belum dikonfigurasi.
function getCalendarClient() {
	if (cachedCalendar) return cachedCalendar
	if (!isConfigured()) return null

	try {
		// require lazy agar aplikasi tetap jalan walau paket belum terpasang
		const { google } = require("googleapis")
		const auth = new google.auth.GoogleAuth({
			credentials: getCredentials(),
			scopes: SCOPES,
		})
		cachedCalendar = google.calendar({ version: "v3", auth })
		return cachedCalendar
	} catch (err) {
		loadError = `Gagal inisialisasi Google Calendar: ${err.message}`
		return null
	}
}

// Normalisasi nilai tanggal/waktu (Date atau string) menjadi ISO tanpa zona,
// mis. "2026-11-18T09:00:00". Google menerima format ini + field timeZone.
function toLocalISO(value) {
	if (!value) return null
	const d = value instanceof Date ? value : new Date(value)
	if (isNaN(d.getTime())) return null
	const pad = (n) => String(n).padStart(2, "0")
	return (
		`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
		`T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
	)
}

// Susun body event dari data booking
function buildEventBody(booking) {
	const lines = [
		`Booking: ${booking.booking_number}`,
		`Klien: ${booking.customer_name}`,
	]
	if (booking.customer_phone) lines.push(`Telepon: ${booking.customer_phone}`)
	if (booking.crew_name) lines.push(`Crew/PIC: ${booking.crew_name}`)
	if (booking.notes) lines.push(`Catatan: ${booking.notes}`)

	return {
		summary: `${booking.booking_number} — ${booking.title}`,
		location: booking.location || undefined,
		description: lines.join("\n"),
		start: { dateTime: toLocalISO(booking.event_start), timeZone: TIMEZONE },
		end: { dateTime: toLocalISO(booking.event_end), timeZone: TIMEZONE },
		extendedProperties: {
			private: { bookingId: String(booking.id) },
		},
	}
}

// Buat event baru. Selalu best-effort: tidak pernah throw.
// Return { ok, eventId?, error? }
async function createEvent(booking) {
	const calendar = getCalendarClient()
	if (!calendar) {
		return { ok: false, error: loadError || "Google Calendar belum dikonfigurasi" }
	}

	try {
		const res = await calendar.events.insert({
			calendarId: getCalendarId(),
			requestBody: buildEventBody(booking),
		})
		return { ok: true, eventId: res.data.id }
	} catch (err) {
		return { ok: false, error: extractError(err) }
	}
}

// Perbarui event yang sudah ada. Best-effort.
async function updateEvent(booking) {
	const calendar = getCalendarClient()
	if (!calendar) {
		return { ok: false, error: loadError || "Google Calendar belum dikonfigurasi" }
	}
	if (!booking.google_event_id) {
		return createEvent(booking)
	}

	try {
		await calendar.events.update({
			calendarId: getCalendarId(),
			eventId: booking.google_event_id,
			requestBody: buildEventBody(booking),
		})
		return { ok: true, eventId: booking.google_event_id }
	} catch (err) {
		return { ok: false, error: extractError(err) }
	}
}

// Hapus event. Best-effort. Event yang sudah tidak ada dianggap sukses.
async function deleteEvent(booking) {
	const calendar = getCalendarClient()
	if (!calendar || !booking.google_event_id) {
		return { ok: true }
	}

	try {
		await calendar.events.delete({
			calendarId: getCalendarId(),
			eventId: booking.google_event_id,
		})
		return { ok: true }
	} catch (err) {
		const status = err?.code || err?.response?.status
		if (status === 404 || status === 410) return { ok: true }
		return { ok: false, error: extractError(err) }
	}
}

function extractError(err) {
	const data = err?.response?.data
	if (data?.error?.message) return data.error.message
	return err?.message || "Kesalahan tidak diketahui"
}

module.exports = {
	isConfigured,
	createEvent,
	updateEvent,
	deleteEvent,
}
