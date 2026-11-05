/* Wishes slider: one wish at a time, auto-advances every 5 s with a progress bar (same timing as the
   Anjana & Swaraj invitation), swipe/arrows, plus a "View all wishes" sheet. Reads the cards the page
   already renders into #wishWall. */
(function () {
  "use strict";

  var css = [
    ".wcar{display:none;max-width:560px;margin:26px auto 0}",
    ".wc-stage{position:relative;height:clamp(230px,58vw,260px);touch-action:pan-y;overflow:hidden}",
    ".wc-stage .wish-entry{position:absolute;inset:0;margin:0;display:flex;flex-direction:column;justify-content:center;animation:none!important;opacity:0;transform:translateX(18px);transition:opacity .6s ease,transform .6s ease;pointer-events:none}",
    ".wc-stage .wish-entry.on{opacity:1;transform:none;pointer-events:auto}",
    ".wc-stage .wish-entry p{display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}",
    ".wc-nav{display:grid;grid-template-columns:44px 1fr 44px;align-items:center;gap:10px;max-width:360px;margin:14px auto 0}",
    ".wc-btn{width:44px;height:44px;border-radius:50%;border:1px solid #dfcba7;background:#fffdf8;color:#705835;font:20px/1 Georgia,serif;cursor:pointer}",
    ".wc-btn:focus-visible,.wc-all:focus-visible,.ws-close:focus-visible{outline:2px solid #b39154;outline-offset:3px}",
    ".wc-mid{text-align:center;font:11px Arial,Helvetica,sans-serif;letter-spacing:.12em;color:#8a7c68}",
    ".wc-bar{height:2px;background:#eadfca;margin-top:8px;overflow:hidden;border-radius:2px}",
    ".wc-bar i{display:block;height:100%;width:0;background:#b39154}",
    ".wc-bar i.run{animation:wcbar 5000ms linear forwards}",
    "@keyframes wcbar{from{width:0}to{width:100%}}",
    ".wc-more{text-align:center;margin-top:16px}",
    ".wc-all{border:1px solid #dfcba7;border-radius:99px;background:#fffdf8;color:#705835;padding:12px 24px;font:12px Arial,Helvetica,sans-serif;letter-spacing:.06em;cursor:pointer}",
    ".wsheet{position:fixed;inset:0;z-index:1200;display:none;align-items:flex-end;background:rgba(40,30,20,.45)}",
    ".wsheet.open{display:flex}",
    ".wsheet-in{width:100%;max-height:82svh;max-height:82vh;display:grid;grid-template-rows:auto 1fr;background:#fffefa;border-radius:20px 20px 0 0;box-shadow:0 -10px 40px rgba(0,0,0,.2);animation:wsUp .3s ease}",
    ".ws-head{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid #eee2ce;color:#8b6c37;font:18px Georgia,serif}",
    ".ws-close{border:0;background:transparent;color:#705835;font:26px/1 Arial,sans-serif;width:44px;height:44px;cursor:pointer}",
    ".wsheet-list{overflow-y:auto;overscroll-behavior:contain;padding:14px 16px 24px;display:grid;gap:12px}",
    ".wsheet-list .wish-entry{margin:0;overflow-wrap:anywhere}",
    "@keyframes wsUp{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}",
    ".wcar.has{display:block}.wishboard-card.wc-on #wishWall{display:none}",
    "@media(min-width:700px){.wsheet{align-items:center;padding:24px}.wsheet-in{max-width:560px;margin:auto;border-radius:20px}}",
    "@media(prefers-color-scheme:dark){.wc-btn,.wc-all{background:#30291f;color:#efe2ca;border-color:#6c5835}.wsheet-in{background:#2a241c}.ws-head{color:#d8bc80;border-color:#514633}.ws-close{color:#efe2ca}.wc-mid{color:#c2b49a}.wc-bar{background:#514633}}",
    "@media(prefers-reduced-motion:reduce){.wc-stage .wish-entry,.wsheet-in{transition:none!important;animation:none!important}.wc-bar i.run{animation:none!important;width:100%}}"
  ].join("\n");

  function init() {
    var wall = document.getElementById("wishWall");
    if (!wall || document.querySelector(".wcar")) return !!wall;
    var card = wall.closest(".wishboard-card");
    if (!card) return true;

    var st = document.createElement("style");
    st.textContent = css;
    document.head.appendChild(st);

    var car = document.createElement("div");
    car.className = "wcar";
    car.innerHTML =
      '<div class="wc-stage" aria-live="polite"></div>' +
      '<div class="wc-nav"><button type="button" class="wc-btn" data-d="-1" aria-label="Previous wish">‹</button>' +
      '<div class="wc-mid"><span class="wc-count"></span><div class="wc-bar"><i></i></div></div>' +
      '<button type="button" class="wc-btn" data-d="1" aria-label="Next wish">›</button></div>' +
      '<div class="wc-more"><button type="button" class="wc-all">View all wishes</button></div>';
    wall.parentNode.insertBefore(car, wall);

    var sheet = document.createElement("div");
    sheet.className = "wsheet";
    sheet.setAttribute("role", "dialog");
    sheet.setAttribute("aria-modal", "true");
    sheet.setAttribute("aria-label", "All wishes");
    sheet.innerHTML =
      '<div class="wsheet-in"><div class="ws-head"><span>All wishes</span>' +
      '<button type="button" class="ws-close" aria-label="Close">×</button></div>' +
      '<div class="wsheet-list"></div></div>';
    document.body.appendChild(sheet);

    var stage = car.querySelector(".wc-stage");
    var count = car.querySelector(".wc-count");
    var bar = car.querySelector(".wc-bar i");
    var list = sheet.querySelector(".wsheet-list");
    var allBtn = car.querySelector(".wc-all");
    var DUR = 5000;
    var idx = 0, slides = [], timer = null, hold = false, offscreen = false;
    var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

    function paused() { return hold || offscreen || document.hidden || sheet.classList.contains("open"); }
    function resetBar() { bar.classList.remove("run"); void bar.offsetWidth; }
    function tick() {
      clearTimeout(timer);
      if (slides.length < 2) { resetBar(); bar.style.width = slides.length ? "100%" : "0"; return; }
      bar.style.width = "";
      if (reduce) { bar.style.width = "100%"; return; }
      if (paused()) { bar.style.animationPlayState = "paused"; return; }
      bar.style.animationPlayState = "";
      resetBar();
      bar.classList.add("run");
      timer = setTimeout(function () { show(idx + 1); }, DUR);
    }
    function show(i) {
      if (!slides.length) return;
      idx = (i + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle("on", k === idx); });
      count.textContent = (idx + 1) + " / " + slides.length;
      resetBar();
      tick();
    }
    function rebuild() {
      var cards = Array.prototype.slice.call(wall.querySelectorAll(".wish-entry"));
      stage.textContent = "";
      list.textContent = "";
      slides = cards.map(function (c) {
        var a = c.cloneNode(true), b = c.cloneNode(true);
        stage.appendChild(a);
        list.appendChild(b);
        return a;
      });
      var has = slides.length > 0;
      car.classList.toggle("has", has);
      card.classList.toggle("wc-on", has);
      allBtn.textContent = "View all wishes (" + slides.length + ")";
      allBtn.parentNode.style.display = slides.length > 1 ? "" : "none";
      car.querySelector(".wc-nav").style.display = slides.length > 1 ? "" : "none";
      show(Math.min(idx, Math.max(slides.length - 1, 0)));
    }

    car.addEventListener("click", function (e) {
      var b = e.target.closest(".wc-btn");
      if (b) show(idx + Number(b.dataset.d));
    });
    var x0 = null;
    stage.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; hold = true; tick(); }, { passive: true });
    stage.addEventListener("touchend", function (e) {
      hold = false;
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1)); else tick();
    }, { passive: true });
    stage.addEventListener("touchcancel", function () { hold = false; x0 = null; tick(); }, { passive: true });
    // Pause while hovering or focused, like the Anjana & Swaraj slider.
    car.addEventListener("mouseenter", function () { hold = true; tick(); });
    car.addEventListener("mouseleave", function () { hold = false; tick(); });
    car.addEventListener("focusin", function () { hold = true; tick(); });
    car.addEventListener("focusout", function () { hold = false; tick(); });
    document.addEventListener("visibilitychange", tick);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (en) { offscreen = !en[0].isIntersecting; tick(); }, { threshold: 0.2 }).observe(car);
    }

    function openSheet() { sheet.classList.add("open"); tick(); document.body.style.overflow = "hidden"; sheet.querySelector(".ws-close").focus(); }
    function closeSheet() { sheet.classList.remove("open"); tick(); document.body.style.overflow = ""; allBtn.focus(); }
    allBtn.addEventListener("click", openSheet);
    sheet.querySelector(".ws-close").addEventListener("click", closeSheet);
    sheet.addEventListener("click", function (e) { if (e.target === sheet) closeSheet(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && sheet.classList.contains("open")) closeSheet(); });

    var pending = false;
    new MutationObserver(function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () { pending = false; rebuild(); });
    }).observe(wall, { childList: true });
    rebuild();
    return true;
  }

  function start() {
    if (init()) return;
    var tries = 0, t = setInterval(function () { if (init() || ++tries > 40) clearInterval(t); }, 250);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
