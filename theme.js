// ===== STUDY//CORE theme layer. Loads LAST (after upgrade.js). =====
(function () {
  const root = document.documentElement;

  // 1. Light / dark mode (remembers your choice; first time it follows your phone)
  let mode = null;
  try { mode = localStorage.getItem("studycore-theme"); } catch (e) {}
  if (!mode) mode = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  root.dataset.theme = mode;

  const toggle = document.createElement("button");
  toggle.id = "theme-toggle";
  toggle.setAttribute("aria-label", "Switch between light and dark mode");
  function paint() { toggle.textContent = root.dataset.theme === "dark" ? "☀" : "☾"; }
  paint();
  document.body.appendChild(toggle);
  toggle.addEventListener("click", function () {
    root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
    try { localStorage.setItem("studycore-theme", root.dataset.theme); } catch (e) {}
    paint();
  });

  // 2. App colour taken from the background picture (bg.jpg)
  const img = new Image();
  img.onload = function () {
    try {
      const c = document.createElement("canvas");
      c.width = c.height = 24;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, 24, 24);
      const d = ctx.getImageData(0, 0, 24, 24).data;
      let r = 0, g = 0, b = 0, w = 0;
      for (let i = 0; i < d.length; i += 4) {
        const weight = Math.max(d[i], d[i + 1], d[i + 2]) - Math.min(d[i], d[i + 1], d[i + 2]) + 1;
        r += d[i] * weight; g += d[i + 1] * weight; b += d[i + 2] * weight; w += weight;
      }
      r /= w; g /= w; b /= w;
      const max = Math.max(r, g, b), diff = max - Math.min(r, g, b);
      if (diff < 8) return; // grey picture: keep the default colour
      let h;
      if (max === r) h = ((g - b) / diff) % 6;
      else if (max === g) h = (b - r) / diff + 2;
      else h = (r - g) / diff + 4;
      h = Math.round(h * 60);
      if (h < 0) h += 360;
      root.style.setProperty("--h", h);
    } catch (e) {}
  };
  img.src = "bg.jpg";

  // 3. Message box: Enter sends on computer, Shift+Enter or phone Enter = new line, box grows with the text
  const box = document.getElementById("question");
  if (box) {
    const grow = function () {
      box.style.height = "auto";
      box.style.height = Math.min(box.scrollHeight, 160) + "px";
    };
    box.addEventListener("input", grow);
    box.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" || e.isComposing) return;
      e.stopImmediatePropagation();
      if (e.shiftKey || window.matchMedia("(pointer: coarse)").matches) return;
      e.preventDefault();
      sendQuestion();
      setTimeout(grow, 0);
    }, true);
    document.getElementById("send").addEventListener("click", function () { setTimeout(grow, 0); });
  }

  // 4. AI screen: mode picker (tap the arrow, choose one) and a "+" menu for hint / explain / quiz
  const modes = document.querySelector(".modes");
  const quick = document.querySelector(".quick");
  const composer = document.querySelector(".chat-input");
  const title = document.querySelector("#ai h1");
  if (modes && quick && composer && title) {
    const modeNames = { general: "General", engineering: "Engineering", autocad: "AutoCAD", coding: "Coding" };
    const quickNames = { simpler: "Explain simpler", hint: "Give me a hint", quiz: "Quiz me", example: "Show an example", steps: "Step by step" };
    modes.querySelectorAll("button").forEach(function (b) { b.textContent = modeNames[b.dataset.mode] || "Image (coming soon)"; });
    quick.querySelectorAll("button").forEach(function (b) { b.textContent = quickNames[b.dataset.quick] || b.textContent; });

    const head = document.createElement("div");
    head.className = "ai-head";
    title.before(head);
    const pick = document.createElement("button");
    pick.id = "mode-pick";
    pick.type = "button";
    head.appendChild(title);
    head.appendChild(pick);
    head.appendChild(modes);
    function showMode() {
      const on = modes.querySelector(".mode.active");
      pick.textContent = on ? on.textContent : "General";
    }
    showMode();

    const plus = document.createElement("button");
    plus.id = "plus-btn";
    plus.type = "button";
    plus.setAttribute("aria-label", "Study tools");
    plus.textContent = "+";
    composer.prepend(plus);
    composer.appendChild(quick);

    function closeMenus() { modes.classList.remove("open"); quick.classList.remove("open"); }
    pick.addEventListener("click", function (e) { e.stopPropagation(); quick.classList.remove("open"); modes.classList.toggle("open"); });
    plus.addEventListener("click", function (e) { e.stopPropagation(); modes.classList.remove("open"); quick.classList.toggle("open"); });
    modes.addEventListener("click", function (e) { if (e.target.closest("button:not(:disabled)")) { showMode(); closeMenus(); } });
    quick.addEventListener("click", function (e) { if (e.target.closest("button:not(:disabled)")) closeMenus(); });
    document.addEventListener("click", closeMenus);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenus(); });
  }
})();