/**
 * FocusMode
 * Handles the distraction-free mode logic.
 */
class FocusMode {
  constructor() {
    this.isActive = localStorage.getItem("focusMode") === "true";
    this.btn = document.getElementById("focusModeBtn");
    this.init();
  }

  init() {
    if (!this.btn) return;

    // Set initial state
    this.updateUI();

    // Ensure dragging is disabled if starting in focus mode
    if (this.isActive) {
        const checkApp = setInterval(() => {
            if (window.App && typeof window.App.toggleDragging === "function") {
                window.App.toggleDragging(false);
                clearInterval(checkApp);
            }
        }, 100);
        setTimeout(() => clearInterval(checkApp), 5000); // safety timeout
    }

    // Bind click event
    this.btn.addEventListener("click", () => this.toggle());

    // Bind keyboard shortcut 'F'
    document.addEventListener("keydown", (e) => {
      const activeEl = document.activeElement;
      const isInput = ["INPUT", "TEXTAREA", "SELECT"].includes(activeEl.tagName) || activeEl.isContentEditable;
      
      if (!isInput && (e.key.toLowerCase() === "f" || e.key === "ب")) {
        e.preventDefault();
        this.toggle();
      }
    });

    // Handle board changes (if board is re-rendered, classes are on body so it should be fine)
  }

  toggle() {
    this.isActive = !this.isActive;
    localStorage.setItem("focusMode", this.isActive);
    this.updateUI();
    
    // تعطيل أو تفعيل السحب في التطبيق
    if (window.App && typeof window.App.toggleDragging === "function") {
        window.App.toggleDragging(!this.isActive);
    }
  }

  updateUI() {
    const body = document.body;
    const btnText = this.btn.querySelector("span");
    const btnIcon = this.btn.querySelector("i");

    if (this.isActive) {
      body.classList.add("focus-mode");
      this.btn.classList.add("active");
      if (btnText) btnText.textContent = window.TRANSLATIONS?.[document.documentElement.lang]?.exit_focus_mode || "Exit Focus Mode";
      if (btnIcon) {
          btnIcon.setAttribute("data-lucide", "eye");
          if (window.lucide) lucide.createIcons();
      }
    } else {
      body.classList.remove("focus-mode");
      this.btn.classList.remove("active");
      if (btnText) btnText.textContent = window.TRANSLATIONS?.[document.documentElement.lang]?.focus_mode || "Focus Mode";
      if (btnIcon) {
          btnIcon.setAttribute("data-lucide", "eye-off");
          if (window.lucide) lucide.createIcons();
      }
    }
  }
}

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    window.focusMode = new FocusMode();
});
