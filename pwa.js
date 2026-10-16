// WORU: browser bar colour, first-time colour, install button, offline support.
(function () {
  var root = document.documentElement;

  // 1. Start with Emerald the first time (your saved choice always wins afterwards)
  try {
    if (!localStorage.getItem("studycore-palette")) {
      localStorage.setItem("studycore-palette", "emerald");
      root.dataset.palette = "emerald";
    }
  } catch (e) {}

  // 2. The browser bar (top of Chrome on your phone) takes the colour of the app
  var meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  function syncBar() {
    var probe = document.createElement("div");
    probe.style.cssText = "position:fixed;left:-9px;top:-9px;width:1px;height:1px;background:var(--bg, #0f1f1a)";
    document.body.appendChild(probe);
    var colour = getComputedStyle(probe).backgroundColor;
    probe.remove();
    if (colour && colour.indexOf("rgba(0, 0, 0, 0)") === -1) meta.setAttribute("content", colour);
  }
  syncBar();
  new MutationObserver(syncBar).observe(root, { attributes: true, attributeFilter: ["data-theme", "data-palette", "style"] });

  // 3. Tick the Emerald swatch if this was the first visit
  var on = document.querySelector('.swatch[data-p="' + root.dataset.palette + '"]');
  if (on) {
    document.querySelectorAll(".swatch.on").forEach(function (s) { s.classList.remove("on"); });
    on.classList.add("on");
  }

  // 4. Offline support
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }

  // 5. "Install WORU" card on the Profile screen
  var host = document.getElementById("profile");
  if (!host || document.getElementById("install-card")) return;
  var card = document.createElement("div");
  card.id = "install-card";
  card.className = "card";
  var label = document.createElement("div");
  label.className = "label";
  label.textContent = "INSTALL WORU";
  var note = document.createElement("p");
  note.className = "small";
  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "mini";
  btn.textContent = "INSTALL APP";
  btn.style.display = "none";
  card.appendChild(label);
  card.appendChild(note);
  card.appendChild(btn);
  host.appendChild(card);

  var standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (standalone) {
    note.textContent = "WORU is installed on this device.";
  } else if (ios) {
    note.textContent = "On iPhone: tap the Share button in Safari, then Add to Home Screen.";
  } else {
    note.textContent = "Install WORU to open it from your home screen like a normal app. If no button appears, open the browser menu and choose Install app or Add to Home screen.";
  }

  var saved = null;
  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    saved = e;
    btn.style.display = "";
  });
  btn.addEventListener("click", function () {
    if (!saved) return;
    saved.prompt();
    saved.userChoice.then(function () { saved = null; btn.style.display = "none"; });
  });
  window.addEventListener("appinstalled", function () {
    note.textContent = "WORU is installed on this device.";
    btn.style.display = "none";
  });
})();
