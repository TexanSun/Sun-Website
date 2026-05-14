/* Texan Sun Facility Services — small, accessible interaction layer */
(function () {
  "use strict";

  // ---------- Sticky header: progressive transparency on scroll ----------
  // Header background is solid at top of page, fades to fully transparent
  // as the user scrolls down. Text/links keep their own color.
  const header = document.getElementById("siteHeader");
  const FADE_START = 0;       // px scrolled before fade begins
  const FADE_END = 320;       // px scrolled where header is fully transparent
  const MAX_OPACITY = 0.94;   // solid (but slightly translucent) at the top
  const MIN_OPACITY = 0;      // fully transparent when scrolled past FADE_END
  let rafId = 0;
  const applyOpacity = () => {
    if (!header) return;
    const y = window.scrollY || window.pageYOffset || 0;
    const t = Math.min(1, Math.max(0, (y - FADE_START) / (FADE_END - FADE_START)));
    const opacity = MAX_OPACITY + (MIN_OPACITY - MAX_OPACITY) * t;
    header.style.setProperty("--header-bg-opacity", opacity.toFixed(3));
    header.style.setProperty("--header-shadow-opacity", (1 - t).toFixed(3));
    if (y > 8) header.classList.add("is-scrolled");
    else header.classList.remove("is-scrolled");
  };
  const onScroll = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => { rafId = 0; applyOpacity(); });
  };
  document.addEventListener("scroll", onScroll, { passive: true });
  applyOpacity();

  // ---------- Mobile nav toggle ----------
  const navToggle = document.getElementById("navToggle");
  const navList = document.getElementById("navList");
  if (navToggle && navList) {
    navToggle.addEventListener("click", () => {
      const open = navList.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    navList.addEventListener("click", (e) => {
      // Mobile: tapping the parent of a dropdown should toggle it open, not navigate
      const toggle = e.target.closest(".dropdown-toggle");
      const isMobile = window.matchMedia("(max-width: 720px)").matches;
      if (toggle && isMobile) {
        const parent = toggle.closest(".has-dropdown");
        if (parent && !parent.classList.contains("is-open")) {
          e.preventDefault();
          parent.classList.add("is-open");
          toggle.setAttribute("aria-expanded", "true");
          return;
        }
      }
      if (e.target.tagName === "A" && !e.target.classList.contains("dropdown-toggle")) {
        navList.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
        // close any open dropdowns
        navList.querySelectorAll(".has-dropdown.is-open").forEach((d) => {
          d.classList.remove("is-open");
          const t = d.querySelector(".dropdown-toggle");
          if (t) t.setAttribute("aria-expanded", "false");
        });
      }
    });
  }

  // ---------- Accordion (Auxiliary Services) ----------
  const triggers = document.querySelectorAll(".acc-trigger");
  triggers.forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".acc-item");
      const panel = item.querySelector(".acc-panel");
      const expanded = btn.getAttribute("aria-expanded") === "true";

      if (expanded) {
        // Close
        panel.style.maxHeight = panel.scrollHeight + "px";
        // Force reflow for transition
        // eslint-disable-next-line no-unused-expressions
        panel.offsetHeight;
        panel.style.maxHeight = "0px";
        btn.setAttribute("aria-expanded", "false");
        item.classList.remove("is-open");
      } else {
        // Open
        item.classList.add("is-open");
        btn.setAttribute("aria-expanded", "true");
        panel.style.maxHeight = panel.scrollHeight + "px";
        panel.addEventListener(
          "transitionend",
          function te(e) {
            if (e.propertyName === "max-height" && btn.getAttribute("aria-expanded") === "true") {
              panel.style.maxHeight = "none";
            }
            panel.removeEventListener("transitionend", te);
          }
        );
      }
    });
  });

  // ---------- Industries: tab + mobile accordion ----------
  const indRoot = document.querySelector("[data-industries]");
  if (indRoot) {
    const tabs = Array.from(indRoot.querySelectorAll(".ind-tab"));
    const panelsContainer = indRoot.querySelector(".ind-panels");
    const panels = Array.from(indRoot.querySelectorAll(".ind-panel"));

    // Track original DOM order so we can restore on desktop
    const originalPanelOrder = panels.slice();

    const activate = (idx) => {
      tabs.forEach((t, i) => {
        const active = i === idx;
        t.classList.toggle("is-active", active);
        t.setAttribute("aria-selected", active ? "true" : "false");
        t.setAttribute("tabindex", active ? "0" : "-1");
      });
      panels.forEach((p, i) => {
        const active = i === idx;
        p.classList.toggle("is-active", active);
        if (active) {
          p.hidden = false;
          // restart the fade-in animation
          p.style.animation = "none";
          // eslint-disable-next-line no-unused-expressions
          p.offsetHeight;
          p.style.animation = "";
        } else {
          p.hidden = true;
        }
      });
    };

    tabs.forEach((tab, idx) => {
      tab.addEventListener("click", () => {
        // On mobile, clicking an already-active tab collapses it
        const isMobile = window.matchMedia("(max-width: 720px)").matches;
        if (isMobile && tab.classList.contains("is-active")) {
          tab.classList.remove("is-active");
          tab.setAttribute("aria-selected", "false");
          const panel = document.getElementById(tab.getAttribute("aria-controls"));
          if (panel) panel.hidden = true;
          return;
        }
        activate(idx);
      });

      // Keyboard navigation: arrows / home / end
      tab.addEventListener("keydown", (e) => {
        const isVertical = !window.matchMedia("(max-width: 720px)").matches;
        let next = null;
        if ((isVertical && e.key === "ArrowDown") || (!isVertical && e.key === "ArrowDown")) {
          next = (idx + 1) % tabs.length;
        } else if ((isVertical && e.key === "ArrowUp") || (!isVertical && e.key === "ArrowUp")) {
          next = (idx - 1 + tabs.length) % tabs.length;
        } else if (e.key === "Home") {
          next = 0;
        } else if (e.key === "End") {
          next = tabs.length - 1;
        }
        if (next !== null) {
          e.preventDefault();
          activate(next);
          tabs[next].focus();
        }
      });
    });

    // Re-arrange DOM for mobile vs desktop
    const reorderForViewport = () => {
      const isMobile = window.matchMedia("(max-width: 720px)").matches;
      const tablist = indRoot.querySelector(".ind-tablist");
      if (!tablist || !panelsContainer) return;

      if (isMobile) {
        // Interleave: place each panel right after its tab inside .ind-tablist
        tabs.forEach((tab) => {
          const panel = document.getElementById(tab.getAttribute("aria-controls"));
          if (panel && panel.parentElement !== tablist) {
            tab.insertAdjacentElement("afterend", panel);
          }
        });
        // Collapse all by default on mobile so the section feels like dropdowns
        tabs.forEach((t) => {
          t.classList.remove("is-active");
          t.setAttribute("aria-selected", "false");
        });
        panels.forEach((p) => { p.hidden = true; });
      } else {
        // Restore original DOM order back into .ind-panels
        originalPanelOrder.forEach((p) => {
          if (p.parentElement !== panelsContainer) {
            panelsContainer.appendChild(p);
          }
        });
        // Ensure first tab is active on desktop
        activate(0);
      }
    };

    reorderForViewport();
    let resizeT;
    window.addEventListener("resize", () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(reorderForViewport, 120);
    });
  }

  // ---------- Quote form: friendly client-side handler ----------
  const form = document.getElementById("quoteForm");
  const note = document.getElementById("formNote");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      // Wire up to a real endpoint when ready. For now, confirm receipt.
      form.reset();
      if (note) {
        note.hidden = false;
        note.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }

  // ---------- Contractor intake modal ----------
  const contractorModal = document.getElementById("contractorModal");
  const contractorForm = document.getElementById("contractorForm");
  const contractorNote = document.getElementById("contractorFormNote");
  const fileInput = document.getElementById("contractorAttachments");
  const fileList = document.getElementById("contractorFileList");
  let lastFocusedBeforeModal = null;

  function openContractorModal() {
    if (!contractorModal) return;
    lastFocusedBeforeModal = document.activeElement;
    contractorModal.hidden = false;
    contractorModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    // Focus first focusable element inside the dialog
    const focusables = contractorModal.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length) {
      // Skip the close button so the first form field gets focus when possible
      const firstField = contractorModal.querySelector("input, select, textarea");
      (firstField || focusables[0]).focus();
    }
  }

  function closeContractorModal() {
    if (!contractorModal || contractorModal.hidden) return;
    contractorModal.hidden = true;
    contractorModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    if (lastFocusedBeforeModal && typeof lastFocusedBeforeModal.focus === "function") {
      lastFocusedBeforeModal.focus();
    }
  }

  document.querySelectorAll("[data-open-contractor-form]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openContractorModal();
    });
  });

  document.querySelectorAll("[data-close-contractor-form]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      closeContractorModal();
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && contractorModal && !contractorModal.hidden) {
      closeContractorModal();
    }
    // Simple focus trap inside the modal
    if (e.key === "Tab" && contractorModal && !contractorModal.hidden) {
      const focusables = contractorModal.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // File list preview
  if (fileInput && fileList) {
    fileInput.addEventListener("change", () => {
      const files = Array.from(fileInput.files || []);
      if (!files.length) {
        fileList.textContent = "";
        return;
      }
      const names = files.map((f) => f.name).join(", ");
      fileList.textContent = names;
    });
  }

  // Contractor form submit
  if (contractorForm) {
    contractorForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!contractorForm.checkValidity()) {
        contractorForm.reportValidity();
        return;
      }
      contractorForm.reset();
      if (fileList) fileList.textContent = "";
      if (contractorNote) {
        contractorNote.hidden = false;
        contractorNote.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          contractorNote.hidden = true;
          closeContractorModal();
        }, 3500);
      }
    });
  }

  // ---------- Walkthrough modal ----------
  const walkthroughModal = document.getElementById("walkthroughModal");
  const walkthroughForm = document.getElementById("walkthroughForm");
  const walkthroughNote = document.getElementById("walkthroughFormNote");
  const walkthroughTimeWindow = document.getElementById("walkthroughTimeWindow");
  const walkthroughCustomTimeWrap = document.getElementById("walkthroughCustomTimeWrap");
  const walkthroughCustomTimeInput = walkthroughCustomTimeWrap
    ? walkthroughCustomTimeWrap.querySelector("input")
    : null;
  let lastFocusedBeforeWalkthrough = null;

  function openWalkthroughModal() {
    if (!walkthroughModal) return;
    lastFocusedBeforeWalkthrough = document.activeElement;
    walkthroughModal.hidden = false;
    walkthroughModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    const firstField = walkthroughModal.querySelector("input, select, textarea");
    if (firstField) firstField.focus();
  }

  function closeWalkthroughModal() {
    if (!walkthroughModal || walkthroughModal.hidden) return;
    walkthroughModal.hidden = true;
    walkthroughModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    if (lastFocusedBeforeWalkthrough && typeof lastFocusedBeforeWalkthrough.focus === "function") {
      lastFocusedBeforeWalkthrough.focus();
    }
  }

  document.querySelectorAll("[data-open-walkthrough-form]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      openWalkthroughModal();
    });
  });

  document.querySelectorAll("[data-close-walkthrough-form]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      closeWalkthroughModal();
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && walkthroughModal && !walkthroughModal.hidden) {
      closeWalkthroughModal();
    }
    if (e.key === "Tab" && walkthroughModal && !walkthroughModal.hidden) {
      const focusables = walkthroughModal.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Reveal custom time input when "Custom time" is selected
  if (walkthroughTimeWindow && walkthroughCustomTimeWrap && walkthroughCustomTimeInput) {
    walkthroughTimeWindow.addEventListener("change", () => {
      const isCustom = walkthroughTimeWindow.value === "custom";
      walkthroughCustomTimeWrap.hidden = !isCustom;
      walkthroughCustomTimeInput.required = isCustom;
      if (isCustom) walkthroughCustomTimeInput.focus();
    });
  }

  if (walkthroughForm) {
    walkthroughForm.addEventListener("submit", (e) => {
      e.preventDefault();
      if (!walkthroughForm.checkValidity()) {
        walkthroughForm.reportValidity();
        return;
      }
      walkthroughForm.reset();
      if (walkthroughCustomTimeWrap) walkthroughCustomTimeWrap.hidden = true;
      if (walkthroughCustomTimeInput) walkthroughCustomTimeInput.required = false;
      if (walkthroughNote) {
        walkthroughNote.hidden = false;
        walkthroughNote.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => {
          walkthroughNote.hidden = true;
          closeWalkthroughModal();
        }, 3500);
      }
    });
  }

  // ---------- Footer year ----------
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
