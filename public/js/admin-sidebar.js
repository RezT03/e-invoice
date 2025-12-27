// Hamburger Menu Toggle
document.addEventListener("DOMContentLoaded", function () {
	const hamburger = document.getElementById("hamburgerMenu")
	const sidebar = document.getElementById("sidebar")
	const overlay = document.getElementById("sidebarOverlay")

	if (!hamburger || !sidebar || !overlay) return

	function toggleSidebar() {
		sidebar.classList.toggle("active")
		overlay.classList.toggle("active")
	}

	function closeSidebar() {
		sidebar.classList.remove("active")
		overlay.classList.remove("active")
	}

	hamburger.addEventListener("click", toggleSidebar)
	overlay.addEventListener("click", closeSidebar)

	// Close sidebar when clicking nav items
	document.querySelectorAll(".nav-item").forEach((item) => {
		item.addEventListener("click", closeSidebar)
	})

	// Close sidebar on window resize (desktop)
	window.addEventListener("resize", function () {
		if (window.innerWidth > 768) {
			closeSidebar()
		}
	})
})
