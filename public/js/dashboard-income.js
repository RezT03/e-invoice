// Carousel ringkasan nilai dashboard: murni manual (scroll, sentuh, tombol, keyboard).
// Tidak ada timer/autoplay di file ini.
document.addEventListener("DOMContentLoaded", () => {
	const viewport = document.getElementById("incomeViewport")
	if (!viewport) return

	const slides = Array.from(viewport.querySelectorAll(".income-slide"))
	const dots = Array.from(document.querySelectorAll("[data-income-index]"))
	const prev = document.querySelector("[data-income-prev]")
	const next = document.querySelector("[data-income-next]")
	if (!slides.length) return

	let activeIndex = 0
	const slideHeight = () =>
		slides[0].getBoundingClientRect().height || viewport.clientHeight || 1

	function update(index) {
		activeIndex = Math.max(0, Math.min(slides.length - 1, index))

		dots.forEach((dot, i) => {
			const isActive = i === activeIndex
			dot.classList.toggle("is-active", isActive)
			if (isActive) dot.setAttribute("aria-current", "true")
			else dot.removeAttribute("aria-current")
		})

		if (prev) prev.disabled = activeIndex === 0
		if (next) next.disabled = activeIndex === slides.length - 1
	}

	function goTo(index) {
		const target = Math.max(0, Math.min(slides.length - 1, index))
		viewport.scrollTo({ top: target * slideHeight(), behavior: "smooth" })
		update(target)
	}

	prev?.addEventListener("click", () => goTo(activeIndex - 1))
	next?.addEventListener("click", () => goTo(activeIndex + 1))
	dots.forEach((dot) => {
		dot.addEventListener("click", () =>
			goTo(Number(dot.dataset.incomeIndex) || 0),
		)
	})

	viewport.addEventListener(
		"scroll",
		() => {
			const index = Math.round(viewport.scrollTop / slideHeight())
			if (index !== activeIndex) update(index)
		},
		{ passive: true },
	)

	viewport.addEventListener("keydown", (event) => {
		const keys = ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End"]
		if (!keys.includes(event.key)) return

		event.preventDefault()
		if (event.key === "Home") goTo(0)
		else if (event.key === "End") goTo(slides.length - 1)
		else if (event.key === "ArrowDown" || event.key === "PageDown")
			goTo(activeIndex + 1)
		else goTo(activeIndex - 1)
	})

	// Selalu mulai dari Income Invoice.
	viewport.scrollTop = 0
	update(0)
})
