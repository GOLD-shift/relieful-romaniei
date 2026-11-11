/* Mărire, glisare și ecran complet pentru orice hartă SVG.
   window.ZoomHarta(cadru, svg, { tinta })
     cadru: elementul care ține harta (primește butoanele +, −, ⟲, ecran complet)
     tinta: ce intră pe ecran complet (implicit cadrul), de ex. tot jocul cu bara de întrebări
   Mouse: rotița mărește, tragi ca să muți. Telefon: două degete măresc, un deget mută.
   O tragere nu contează ca apăsare pe hartă. */
(function () {
"use strict";
const ICON = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  reset: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>',
  full: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  exit: '<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>'
};
const svgIcon = k => `<svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg>`;
const MAX = 10;

window.ZoomHarta = function (cadru, svg, opt = {}) {
  if (!cadru || !svg) return;
  const tinta = opt.tinta || cadru;
  const vb0 = svg.viewBox.baseVal;
  const base = { x: vb0.x, y: vb0.y, w: vb0.width, h: vb0.height };
  let v = { ...base };
  const set = () => {
    svg.setAttribute("viewBox", `${v.x} ${v.y} ${v.w} ${v.h}`);
    const zoom = base.w / v.w;
    // la mărime normală pagina se poate derula cu degetul; mărită (sau pe tot ecranul), degetul mută harta
    svg.style.touchAction = zoom > 1.01 || tinta.classList.contains("zh-full") ? "none" : "pan-y";
    cadru.classList.toggle("zh-zoomed", zoom > 1.01);
  };
  const clamp = () => {
    v.w = Math.min(base.w, Math.max(base.w / MAX, v.w)); v.h = v.w * base.h / base.w;
    v.x = Math.min(base.x + base.w - v.w, Math.max(base.x, v.x));
    v.y = Math.min(base.y + base.h - v.h, Math.max(base.y, v.y));
  };
  const toSvg = (cx, cy) => { const r = svg.getBoundingClientRect(), s = Math.min(r.width / v.w, r.height / v.h);
    const ox = r.left + (r.width - v.w * s) / 2, oy = r.top + (r.height - v.h * s) / 2;
    return { x: v.x + (cx - ox) / s, y: v.y + (cy - oy) / s, s }; };
  const zoomAt = (f, cx, cy) => {
    const p = cx == null ? { x: v.x + v.w / 2, y: v.y + v.h / 2 } : toSvg(cx, cy);
    const nw = Math.min(base.w, Math.max(base.w / MAX, v.w / f)), k = nw / v.w;
    v.x = p.x - (p.x - v.x) * k; v.y = p.y - (p.y - v.y) * k; v.w = nw; v.h = nw * base.h / base.w;
    clamp(); set();
  };

  // butoanele
  cadru.classList.add("zh");
  const bar = document.createElement("div");
  bar.className = "zh-btns";
  bar.innerHTML = `<button type="button" data-z="in" aria-label="Mărește harta">${svgIcon("plus")}</button>
    <button type="button" data-z="out" aria-label="Micșorează harta">${svgIcon("minus")}</button>
    <button type="button" data-z="reset" aria-label="Arată toată harta">${svgIcon("reset")}</button>
    <button type="button" data-z="full" aria-label="Ecran complet">${svgIcon("full")}</button>`;
  cadru.appendChild(bar);
  const fullBtn = bar.querySelector('[data-z="full"]');
  bar.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    e.stopPropagation();
    if (b.dataset.z === "in") zoomAt(1.6);
    else if (b.dataset.z === "out") zoomAt(1 / 1.6);
    else if (b.dataset.z === "reset") { v = { ...base }; set(); }
    else toggleFull();
  });

  // ecran complet: API-ul browserului unde merge, altfel pagina se întinde peste tot ecranul (ex. iPhone)
  const isFull = () => tinta.classList.contains("zh-full");
  const onFull = on => {
    tinta.classList.toggle("zh-full", on);
    document.documentElement.classList.toggle("zh-lock", on);
    fullBtn.innerHTML = svgIcon(on ? "exit" : "full");
    fullBtn.setAttribute("aria-label", on ? "Ieși din ecran complet" : "Ecran complet");
    set();
  };
  function toggleFull() {
    if (!isFull()) {
      onFull(true);
      try { const p = tinta.requestFullscreen && tinta.requestFullscreen(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
    } else {
      onFull(false);
      try { if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {}); } catch (e) {}
    }
  }
  document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && isFull() && document.body.contains(tinta)) onFull(false); });
  tinta.addEventListener("keydown", e => { if (e.key === "Escape" && isFull()) toggleFull(); });

  // rotița mouse-ului
  svg.addEventListener("wheel", e => { e.preventDefault(); zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX, e.clientY); }, { passive: false });

  // degete și mouse: un pointer mută, doi pointeri măresc
  const pts = new Map(); let start = null, moved = false, pinch = null;
  svg.addEventListener("pointerdown", e => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) { start = { x: e.clientX, y: e.clientY, v: { ...v } }; moved = false; }
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), w: v.w }; moved = true; }
  });
  svg.addEventListener("pointermove", e => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size >= 2 && pinch) {
      const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d > 0) { const target = pinch.w * pinch.d / d; zoomAt(v.w / target, (a.x + b.x) / 2, (a.y + b.y) / 2); }
      e.preventDefault();
    } else if (start) {
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      if (!moved && Math.hypot(dx, dy) < 6) return;
      if (base.w / v.w <= 1.01 && !isFull() && e.pointerType !== "mouse") return;   // nemărită pe telefon: degetul derulează pagina
      moved = true;
      try { svg.setPointerCapture(e.pointerId); } catch (er) {}
      const s = toSvg(e.clientX, e.clientY).s;
      v.x = start.v.x - dx / s; v.y = start.v.y - dy / s; clamp(); set();
    }
  });
  const up = e => {
    pts.delete(e.pointerId);
    if (pts.size < 2) pinch = null;
    if (pts.size === 1) { const [p] = [...pts.values()]; start = { x: p.x, y: p.y, v: { ...v } }; }
    if (pts.size === 0) start = null;
    if (moved) { cadru.classList.add("zh-dragging"); setTimeout(() => cadru.classList.remove("zh-dragging"), 80); }
  };
  svg.addEventListener("pointerup", up); svg.addEventListener("pointercancel", up);
  // după o tragere, „click”-ul de la final nu e o apăsare pe hartă
  cadru.addEventListener("click", e => {
    if (cadru.classList.contains("zh-dragging")) { e.stopPropagation(); e.preventDefault(); }
    cadru.classList.remove("zh-dragging"); moved = false;
  }, true);

  set();
  return { reset: () => { v = { ...base }; set(); } };
};
})();
