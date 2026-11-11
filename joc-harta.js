/* Motorul jocurilor pe harta oarbă (România – unități de relief, Europa – țări, capitale).
   window.JocHarta(el, cfg)
   cfg = { key, titlu, w, h, fundal (SVG), regiuni: [{id, n, d, mic:[x,y]}], intreaba: r => text,
           eticheta: r => text (răspunsul), moduri: ["click","variante","scrii"], peste (SVG desenat deasupra) } */
(function () {
"use strict";
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const norm = s => [...String(s).toLowerCase().normalize("NFD")].filter(c => c.charCodeAt(0) < 768 || c.charCodeAt(0) > 879).join("").replace(/[^a-z0-9]+/g, " ").trim();
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const store = {
  get(k, d) { try { const v = localStorage.getItem("rr2-" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("rr2-" + k, JSON.stringify(v)); } catch (e) {} }
};
const MODES = { click: "Click pe hartă", variante: "Alegi din variante", scrii: "Scrii numele" };
const PTS = [100, 66, 33, 0];
const fmt = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

window.JocHarta = function (el, cfg) {
  const byId = {}; cfg.regiuni.forEach(r => byId[r.id] = r);
  const eticheta = cfg.eticheta || (r => r.n);
  let mode = store.get("mod-" + cfg.key, cfg.moduri[0]);
  if (!cfg.moduri.includes(mode)) mode = cfg.moduri[0];
  let queue, pos, tries, res, confuz, t0, timer, locked, invat = false, subset = null;

  function shell() {
    el.innerHTML = `
    <div class="jh">
      <div class="jh-bar">
        <span class="jh-prog" id="jhProg">0 / 0 · 0%</span>
        <div class="jh-ask" id="jhAsk"></div>
        <span class="jh-time" id="jhTime">00:00</span>
        <button class="jh-ic" id="jhSkip" title="Sari peste (revine la final)" aria-label="Sari peste">⏭</button>
      </div>
      <div class="jh-map" id="jhMap">
        <svg viewBox="0 0 ${cfg.w} ${cfg.h}" role="img" aria-label="${esc(cfg.titlu)}">
          <rect class="jh-sea" x="${-2 * cfg.w}" y="${-2 * cfg.h}" width="${5 * cfg.w}" height="${5 * cfg.h}"/>${cfg.fundal || ""}
          <g id="jhReg">${cfg.regiuni.map(r => `<path class="jh-r" data-id="${r.id}" d="${r.d}"/>`).join("")}</g>
          <g id="jhMic">${cfg.regiuni.filter(r => r.mic).map(r => `<circle class="jh-r jh-mic" data-id="${r.id}" cx="${r.mic[0]}" cy="${r.mic[1]}" r="${cfg.razaMic || 7}"/>`).join("")}</g>
          ${cfg.peste || ""}
          <g id="jhLbl" pointer-events="none"></g>
        </svg>
        <div class="jh-toast" id="jhToast" hidden></div>
      </div>
      <div class="jh-under" id="jhUnder"></div>
      <div class="row jh-tools">
        <div class="modes small-modes">${cfg.moduri.map(m => `<button data-m="${m}" class="${m === mode ? "on" : ""}">${MODES[m]}</button>`).join("")}</div>
        <div class="chips"><button class="chip" id="jhLearn">Mod învățare: oprit</button><button class="chip" id="jhRestart">Repornește</button></div>
      </div>
      <p class="muted small" id="jhBest"></p>
    </div>`;
    el.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { mode = b.dataset.m; store.set("mod-" + cfg.key, mode); subset = null; shell(); start(); });
    el.querySelector("#jhRestart").onclick = () => { subset = null; start(); };
    el.querySelector("#jhSkip").onclick = skip;
    el.querySelector("#jhLearn").onclick = () => { invat = !invat; el.querySelector("#jhLearn").textContent = "Mod învățare: " + (invat ? "pornit" : "oprit"); el.querySelector(".jh").classList.toggle("learn", invat); hideLbl(); };
    const svg = el.querySelector("svg");
    if (window.ZoomHarta) ZoomHarta(el.querySelector(".jh-map"), svg, { tinta: el.querySelector(".jh") });
    svg.addEventListener("click", e => { const t = e.target.closest(".jh-r"); if (t) onRegion(t.dataset.id, e); });
    svg.addEventListener("mousemove", e => { if (!invat) return; const t = e.target.closest(".jh-r"); t ? showLbl(t.dataset.id, e) : hideLbl(); });
    svg.addEventListener("mouseleave", hideLbl);
  }
  const regEls = id => el.querySelectorAll(`.jh-r[data-id="${id}"]`);
  const setCls = (id, cls) => regEls(id).forEach(p => { p.classList.remove("c1", "c2", "c3", "c4", "hi", "bad"); if (cls) p.classList.add(cls); });
  function svgPt(e) { const svg = el.querySelector("svg"), p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); }
  function showLbl(id, e) {
    const q = svgPt(e), g = el.querySelector("#jhLbl"), fs = cfg.w / 55;
    g.innerHTML = `<text class="jh-lbl" x="${q.x}" y="${q.y - fs * 0.8}" text-anchor="middle" style="font-size:${fs}px">${esc(eticheta(byId[id]))}</text>`;
  }
  function hideLbl() { const g = el.querySelector("#jhLbl"); if (g) g.innerHTML = ""; }
  function toast(html, ms = 1400) {
    const t = el.querySelector("#jhToast"); t.innerHTML = html; t.hidden = false;
    clearTimeout(toast.h); toast.h = setTimeout(() => { t.hidden = true; }, ms);
  }

  function start() {
    queue = shuffle(subset || cfg.regiuni.map(r => r.id)); pos = 0; tries = 0; res = {}; confuz = []; locked = false;
    cfg.regiuni.forEach(r => setCls(r.id, null));
    t0 = Date.now(); clearInterval(timer);
    timer = setInterval(() => { if (!document.body.contains(el.querySelector("#jhTime"))) { clearInterval(timer); return; } el.querySelector("#jhTime").textContent = fmt(Math.floor((Date.now() - t0) / 1000)); }, 500);
    const b = store.get("best-" + cfg.key + "-" + mode, null);
    el.querySelector("#jhBest").textContent = b ? `Record în modul „${MODES[mode]}”: ${b.p}% în ${fmt(b.s)}.` : "Încă nu ai un record în acest mod.";
    ask();
  }
  function progress() {
    const done = Object.keys(res).length, N = queue.length;
    const pct = done ? Math.round(Object.values(res).reduce((s, v) => s + v, 0) / done) : 0;
    el.querySelector("#jhProg").textContent = `${done} / ${N} · ${pct}%`;
  }
  function ask() {
    progress();
    const under = el.querySelector("#jhUnder"); under.innerHTML = "";
    if (pos >= queue.length) return end();
    const r = byId[queue[pos]]; tries = 0; locked = false;
    if (mode === "click") {
      el.querySelector("#jhAsk").innerHTML = `Apasă pe <b>${esc(cfg.intreaba(r))}</b>`;
    } else {
      setCls(r.id, "hi");
      el.querySelector("#jhAsk").innerHTML = mode === "variante" ? `Ce este zona marcată?` : `Scrie numele zonei marcate`;
      if (mode === "variante") {
        const opts = shuffle([r.id].concat(shuffle(cfg.regiuni.map(x => x.id).filter(x => x !== r.id)).slice(0, 2)));
        under.innerHTML = `<div class="opts">${opts.map(o => `<button data-o="${o}">${esc(eticheta(byId[o]))}</button>`).join("")}</div>`;
        under.querySelectorAll("[data-o]").forEach(b => b.onclick = () => {
          if (locked || b.disabled) return;
          if (b.dataset.o === r.id) { b.classList.add("right"); answer(r.id, true); }
          else { b.classList.add("wrong"); b.disabled = true; tries++; confuz.push([r.id, b.dataset.o]); if (tries >= 2) answer(r.id, false); }
        });
      } else {
        under.innerHTML = `<form class="jh-type" id="jhForm"><input id="jhIn" autocomplete="off" placeholder="Scrie numele…" aria-label="Numele zonei marcate"><button class="btn primary">Verifică</button><button type="button" class="btn" id="jhGive">Nu știu</button></form>`;
        const inp = under.querySelector("#jhIn"); inp.focus();
        under.querySelector("#jhGive").onclick = () => answer(r.id, false);
        under.querySelector("#jhForm").onsubmit = e => {
          e.preventDefault(); if (locked) return;
          const ok = [eticheta(r)].concat(r.alt || []).some(a => norm(a) === norm(inp.value) || (norm(inp.value).length > 3 && norm(a).replace(/^(muntii|podisul|campia|dealurile|subcarpatii) /, "") === norm(inp.value)));
          if (ok) answer(r.id, true);
          else { tries++; inp.value = ""; toast("Nu e corect. Mai încearcă."); if (tries >= 3) answer(r.id, false); }
        };
      }
    }
  }
  function onRegion(id, e) {
    if (invat || locked || pos >= queue.length) return;
    if (mode !== "click") return;
    const want = queue[pos];
    if (res[id] !== undefined && id !== want) return;      // zonele deja ghicite nu mai contează
    if (id === want) return answer(want, true);
    tries++; confuz.push([want, id]);
    regEls(id).forEach(p => { p.classList.add("bad"); setTimeout(() => p.classList.remove("bad"), 600); });
    toast(`Ai apăsat pe: <b>${esc(eticheta(byId[id]))}</b>`);
    if (tries >= 3) answer(want, false);
  }
  function answer(id, ok) {
    locked = true;
    const p = ok ? PTS[Math.min(tries, 2)] : 0;
    res[id] = p;
    setCls(id, ok ? ["c1", "c2", "c3"][Math.min(tries, 2)] : "c4");
    if (!ok) toast(`Era: <b>${esc(eticheta(byId[id]))}</b>`, 1600);
    progress();
    setTimeout(() => { pos++; ask(); }, ok ? 350 : 1500);
  }
  function skip() {
    if (locked || pos >= queue.length) return;
    if (mode !== "click") setCls(queue[pos], null);
    queue.push(queue.splice(pos, 1)[0]); ask();
  }
  function end() {
    clearInterval(timer);
    const secs = Math.floor((Date.now() - t0) / 1000), N = queue.length;
    const pct = Math.round(Object.values(res).reduce((s, v) => s + v, 0) / N);
    el.querySelector("#jhAsk").innerHTML = `Gata!`;
    const wrong = queue.filter(id => res[id] < 100);
    const full = !subset;
    let rec = "";
    if (full) {
      const k = "best-" + cfg.key + "-" + mode, b = store.get(k, null);
      if (!b || pct > b.p || (pct === b.p && secs < b.s)) { store.set(k, { p: pct, s: secs }); rec = " Record nou!"; }
    }
    const conf = {}; confuz.forEach(([a, b]) => { (conf[a] = conf[a] || new Set()).add(b); });
    el.querySelector("#jhUnder").innerHTML = `<div class="panel">
      <h3>${pct}% în ${fmt(secs)}${rec}</h3>
      ${wrong.length ? `<span class="label">De repetat</span><ul class="list">${wrong.map(id => `<li><b>${esc(eticheta(byId[id]))}</b>${conf[id] ? ` – confundat cu ${[...conf[id]].map(c => esc(eticheta(byId[c]))).join(", ")}` : ""}</li>`).join("")}</ul>` : `<p>Totul din prima. Felicitări!</p>`}
      <div class="row" style="justify-content:flex-start"><button class="btn primary" id="jhAgain">Joacă din nou</button>
      ${wrong.length ? `<button class="btn" id="jhDeep">Învățare profundă (${wrong.length})</button>` : ""}</div>
      ${full ? "" : `<p class="muted small">Runda de învățare profundă nu intră la record.</p>`}</div>`;
    el.querySelector("#jhAgain").onclick = () => { subset = null; start(); };
    const d = el.querySelector("#jhDeep");
    if (d) d.onclick = () => {
      const ids = new Set(wrong); confuz.forEach(([a, b]) => { if (ids.has(a)) ids.add(b); });
      subset = [...ids]; start();
    };
  }
  shell(); start();
};
})();
