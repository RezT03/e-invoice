// Unggah bukti bayar (proof of payment).
// File disimpan di <root>/uploads/payments dan TIDAK di dalam folder public,
// sehingga hanya bisa diakses lewat route admin yang terautentikasi
// (GET /admin/payments/:id/proof).
const multer = require("multer")
const path = require("path")
const fs = require("fs")
const { v4: uuidv4 } = require("uuid")

const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "payments")

// Pastikan folder ada saat modul dimuat
try {
	fs.mkdirSync(UPLOAD_DIR, { recursive: true })
} catch (e) {
	console.error("Gagal membuat folder uploads/payments:", e.message)
}

// Format yang diizinkan (gambar bukti bayar)
const ALLOWED_EXT = [".jpg", ".jpeg", ".png", ".heic", ".heif"]
const ALLOWED_MIME = [
	"image/jpeg",
	"image/jpg",
	"image/pjpeg",
	"image/png",
	"image/heic",
	"image/heif",
	"image/heic-sequence",
	"image/heif-sequence",
]

// Peta ekstensi -> MIME (dipakai saat menyajikan file agar content-type benar)
const MIME_BY_EXT = {
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".png": "image/png",
	".heic": "image/heic",
	".heif": "image/heif",
}

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

const storage = multer.diskStorage({
	destination: (req, file, cb) => cb(null, UPLOAD_DIR),
	filename: (req, file, cb) => {
		let ext = path.extname(file.originalname || "").toLowerCase()
		if (!ALLOWED_EXT.includes(ext)) {
			// fallback berdasarkan mime bila ekstensi tidak dikenal
			const byMime = Object.keys(MIME_BY_EXT).find(
				(e) => MIME_BY_EXT[e] === (file.mimetype || "").toLowerCase(),
			)
			ext = byMime || ".jpg"
		}
		cb(null, `${uuidv4()}${ext}`)
	},
})

function fileFilter(req, file, cb) {
	const ext = path.extname(file.originalname || "").toLowerCase()
	const mime = (file.mimetype || "").toLowerCase()
	if (ALLOWED_EXT.includes(ext) || ALLOWED_MIME.includes(mime)) {
		return cb(null, true)
	}
	cb(
		new Error(
			"Format bukti bayar harus JPG, JPEG, PNG, atau HEIC",
		),
	)
}

const upload = multer({
	storage,
	fileFilter,
	limits: { fileSize: MAX_SIZE },
})

// Middleware: bungkus upload.single agar error (format/ukuran) tidak
// menjatuhkan aplikasi, melainkan kembali ke form dengan pesan error.
function uploadProof(req, res, next) {
	upload.single("proof")(req, res, (err) => {
		if (!err) return next()

		let message = err.message || "Gagal mengunggah bukti bayar"
		if (err.code === "LIMIT_FILE_SIZE") {
			message = "Ukuran bukti bayar maksimal 10 MB"
		}
		const back = (req.originalUrl || "/admin/payments/create").split("?")[0]
		return res.redirect(back + "?error=" + encodeURIComponent(message))
	})
}

module.exports = {
	upload,
	uploadProof,
	UPLOAD_DIR,
	ALLOWED_EXT,
	ALLOWED_MIME,
	MIME_BY_EXT,
	MAX_SIZE,
}
