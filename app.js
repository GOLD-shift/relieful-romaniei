/* Aplicația: citește window.GEO (data.js) și window.ILL (ilustratii.js) și construiește ecranele. */
(function () {
"use strict";
const G = window.GEO, ILL = window.ILL || {};
const V = document.getElementById("view");
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const COL = { munte: "var(--h-munte)", deal: "var(--h-deal)", podis: "var(--h-podis)", campie: "var(--h-campie)", delta: "var(--h-delta)" };
const TIPN = { munte: "munți", deal: "dealuri și subcarpați", podis: "podișuri și depresiune", campie: "câmpii", delta: "deltă" };
const U = G.unitati, byId = {}; U.forEach(u => byId[u.id] = u);
const T = G.tipuri, tipById = {}; T.forEach(t => tipById[t.id] = t);
const CAP = G.capitole, capById = {}; CAP.forEach(c => capById[c.id] = c);
const full = U.filter(u => !u.incomplet);
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];

// progresul se ține doar în acest browser
const S = {
  get(k, d) { try { const v = localStorage.getItem("rr2-" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem("rr2-" + k, JSON.stringify(v)); } catch (e) {} }
};
let learned = S.get("learned", {}), boxes = S.get("boxes", {}), best = S.get("best", {});

const ill = (id, cls = "") => ILL[id] ? `<div class="ill ${cls}">${ILL[id]}</div>` : "";
const dot = u => `<i class="dot" style="background:${COL[u.tip]}"></i>`;
const plural = u => /^(Munții|Carpații|Subcarpații|Dealurile)/.test(u.nume) ? "s-au format" : "s-a format";
const maxAlt = u => (u.varfuri || []).reduce((m, v) => Math.max(m, v.m), 0);

/* ---------------- harta ----------------
   Imaginea de relief acoperă exact lon 20–30, lat 43,4–48,5 (proiecție liniară),
   deci 1° lon = KX unități și 1° lat = 100 unități în SVG. */
const H = G.harta, KY = 100, KX = KY * (H.w / H.h) * (H.latMax - H.latMin) / (H.lonMax - H.lonMin);
const MW = (H.lonMax - H.lonMin) * KX, MH = (H.latMax - H.latMin) * KY;
const P = ([lon, lat]) => [((lon - H.lonMin) * KX).toFixed(1), ((H.latMax - lat) * KY).toFixed(1)];
const unP = (x, y) => [H.lonMin + x / KX, H.latMax - y / KY];
const path = pts => "M" + pts.map(p => P(p).join(" ")).join("L") + "Z";
// contururile calculate din altitudini (harta-romania.js); dacă lipsesc, cele aproximative din data.js
const HR = window.HARTA_RO || { unitati: {}, vecini: [], granita: [] };
const polysOf = u => (HR.unitati[u.id] && HR.unitati[u.id].length ? HR.unitati[u.id] : (u.poligoane || []));
function mapSVG(o = {}) {
  // o.sel: unitate selectată · o.dim: estompează restul · o.regions: arată zonele colorate · o.labels: etichete
  // o.only: arată doar zona acestei unități · o.extra: SVG suplimentar (pini în jocuri)
  let s = `<svg viewBox="0 0 ${MW.toFixed(1)} ${MH.toFixed(1)}" role="img" aria-label="Harta de relief a României">`;
  s += `<image href="${H.imagine}" x="0" y="0" width="${MW.toFixed(1)}" height="${MH.toFixed(1)}" preserveAspectRatio="none"/>`;
  if (o.regions !== false) U.forEach(u => {
    if (o.only && o.only !== u.id) return;
    const rings = polysOf(u); if (!rings.length) return;
    const cls = "reg" + (o.sel === u.id || o.only === u.id ? " on" : (o.sel && o.dim ? " dim" : ""));
    s += `<path class="${cls}" data-id="${u.id}" style="fill:${COL[u.tip]};fill-rule:evenodd" d="${rings.map(path).join("")}"><title>${esc(u.nume)}</title></path>`;
  });
  if (o.subs && HR.meta) s += `<path class="sub-l" d="${HR.meta.sub.map(x => HR.sub[x.id].map(path).join("")).join("")}"/>`;
  if (o.labels && o.subs && HR.meta) HR.meta.sub.forEach(x => { const [px, py] = P(HR.puncte[x.id]); s += `<text class="sub-t" x="${px}" y="${py}" text-anchor="middle">${esc(x.scurt)}</text>`; });
  else if (o.labels) U.forEach(u => { if (!u.eticheta) return; const [x, y] = P(u.eticheta); s += `<text x="${x}" y="${y}" text-anchor="middle">${esc(u.scurt)}</text>`; });
  if (o.vecini !== false) G.vecini.forEach(([n, lo, la]) => { const [x, y] = P([lo, la]); s += `<text class="nb" x="${x}" y="${y}" text-anchor="middle">${esc(n)}</text>`; });
  return s + (o.extra || "") + "</svg>";
}
const credit = p => `${esc(p.autor)}, ${esc(p.licenta)}, Wikimedia Commons`;
const fig = p => `<figure class="foto"><img src="${p.f}" alt="${esc(p.titlu)}" loading="lazy"><figcaption>${esc(p.titlu)}<span>${credit(p)}</span></figcaption></figure>`;
const km = (a, b) => { const R = 6371, r = Math.PI / 180, dLa = (b[1] - a[1]) * r, dLo = (b[0] - a[0]) * r;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLo / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); };
const inPoly = (pt, pg) => { let c = false; for (let i = 0, j = pg.length - 1; i < pg.length; j = i++) {
  const [xi, yi] = pg[i], [xj, yj] = pg[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c; } return c; };
const bindMap = fn => V.querySelectorAll(".reg").forEach(r => r.addEventListener("click", () => fn(r.dataset.id)));

/* ---------------- navigare ---------------- */
let state = { view: "acasa", arg: null };
function go(view, arg) {
  if (!R[view]) view = "acasa";
  state = { view, arg: arg || null };
  window.scrollTo(0, 0);
  render();
  try { history.replaceState(null, "", "#" + view + (arg ? "-" + arg : "")); } catch (e) {}
}
function render() {
  R[state.view]();
  document.querySelectorAll("#nav button").forEach(b => b.classList.toggle("on", b.dataset.go === state.view || (state.view === "unitate" && b.dataset.go === "lectii")));
}

/* ---------------- ACASĂ ---------------- */
const stat = (l, n, t) => `<div class="stat"><span class="label">${l}</span><b>${n} <span class="muted small">/ ${t}</span></b><div class="bar"><i style="width:${t ? Math.round(n / t * 100) : 0}%"></i></div></div>`;
function acasa() {
  const nL = full.filter(u => learned[u.id]).length;
  const cards = allCards(), stap = cards.filter(c => (boxes[c.id] || 1) >= 4).length;
  V.innerHTML = `
  <section class="hero">
    <div class="stack">
      <span class="label">Geografie · după caietul tău</span>
      <h1>Relieful României</h1>
      <p class="lead">Fiecare unitate de relief se învață cu aceleași 4 întrebări: <b>formare, roci, altitudine, tipuri de relief</b>. Apoi le compari între ele și te testezi.</p>
      <div class="row" style="justify-content:flex-start"><button class="btn primary" data-go="lectii">Începe lecțiile</button><button class="btn" data-go="jocuri" data-arg="ro">Jocuri pe hartă</button><button class="btn" data-go="exersare">Exersează</button></div>
    </div>
    <div class="map panel" style="padding:6px">${mapSVG({ labels: false })}</div>
  </section>
  <section class="stats">
    ${stat("Unități învățate", nL, full.length)}
    ${stat("Cartonașe stăpânite", stap, cards.length)}
    <div class="stat"><span class="label">Record la „Ce unitate e?”</span><b>${best.unitate || 0}</b><span class="muted small">răspunsuri corecte la rând</span></div>
  </section>
  <section class="stack"><h2>Capitole</h2><div class="grid">${CAP.map(c => {
    const us = U.filter(u => u.capitol === c.id), l = us.filter(u => learned[u.id]).length;
    return `<div class="panel cap" style="--c:${COL[c.tip]}" data-go="lectii" data-arg="${c.id}" tabindex="0" role="button"><h3>${esc(c.nume)}</h3><p class="muted small">${esc(c.intro)}</p><span class="count">${us.length} ${us.length === 1 ? "unitate" : "unități"} · ${l} învățate</span></div>`;
  }).join("")}</div></section>
  <section class="stack"><h2>Cum înveți</h2><div class="steps">
    <div class="panel"><span class="label">Pasul 1</span><h3>Grila de 4</h3><p class="small">Deschide o unitate în <b>Lecții</b> și răspunde cu voce tare: formare, roci, altitudine, relief.</p></div>
    <div class="panel"><span class="label">Pasul 2</span><h3>Familii și excepții</h3><p class="small">Carpații: cutare alpină. Dealuri și podișuri: sedimentare. Excepțiile (Mehedinți, Dobrogea de Nord) se cer des.</p></div>
    <div class="panel"><span class="label">Pasul 3</span><h3>Compară</h3><p class="small">În <b>Comparații</b> pui oricare două unități față în față și vezi ce au la fel și ce diferă.</p></div>
    <div class="panel"><span class="label">Pasul 4</span><h3>Testează-te</h3><p class="small">Cartonașe cu cutii (repetare la intervale) și 3 tipuri de test. Revino după 1, 3 și 7 zile.</p></div>
  </div></section>
  <section class="note"><h3>Formula de răspuns la examen</h3>
    <p><b>Asemănare:</b> „Ambele unități s-au format prin…”, „Ambele sunt alcătuite din…”, „La ambele apar…”.<br>
    <b>Deosebire:</b> „<i>X</i> s-a format prin…, <b>în timp ce</b> <i>Y</i> s-a format prin…”. Pune ambele părți în aceeași propoziție.</p></section>
  <section class="note"><h3>Trucuri de memorare</h3><ul class="list">${G.trucuri.map(t => `<li>${esc(t)}</li>`).join("")}</ul></section>
  <p class="muted small">${esc(G.sursa)} De verificat în manual: ${G.deVerificat.map(esc).join("; ")}. Progresul se salvează doar în acest browser.
  <button class="chip" data-go="surse">Surse imagini</button></p>`;
  bindMap(id => go("unitate", id));
}

/* ---------------- SURSE IMAGINI ---------------- */
function surse() {
  const row = p => `<tr><td>${esc(p.titlu)}</td><td>${esc(p.autor)}</td><td>${esc(p.licenta)}</td><td><a href="https://commons.wikimedia.org/wiki/File:${encodeURIComponent(p.sursa)}" target="_blank" rel="noopener">${esc(p.sursa)}</a></td></tr>`;
  V.innerHTML = `<section class="stack"><h2>Surse imagini</h2>
    <p class="lead">Hărțile și fotografiile sunt de pe Wikimedia Commons, cu licențe libere care cer trecerea autorului. Desenele schematice sunt făcute pentru această aplicație.</p>
    <div class="panel tbl"><table><thead><tr><th>Imagine</th><th>Autor</th><th>Licență</th><th>Fișier original</th></tr></thead>
    <tbody>${G.surseHarti.concat(G.poze).map(row).join("")}</tbody></table></div>
    <p class="small muted">Hărțile oarbe: granițele țărilor sunt din Natural Earth (domeniu public). Granițele unităților de relief sunt calculate pentru această aplicație din altitudinile Mapzen Terrarium (AWS Open Data). Sunt aproximative și nu o hartă oficială.</p></section>`;
}

/* ---------------- HARTA ---------------- */
function mini(u) {
  return `<div class="panel" style="border-left:5px solid ${COL[u.tip]}">
    <div class="row"><h3>${esc(u.nume)}</h3><span class="alt">${esc(u.alt)}</span></div>
    ${u.incomplet ? `<p class="muted">Subunități: ${u.subunitati.map(esc).join(", ")}. Urmează informații.</p>`
      : `<p><b>Formare:</b> ${esc(u.formare)}</p><p><b>Roci:</b> ${esc(u.roci)}</p>`}
    <div class="row"><div class="thumbs">${(u.tags || []).map(t => ill(t)).join("")}</div><button class="btn primary" data-go="unitate" data-arg="${u.id}">Deschide fișa</button></div></div>`;
}
function harta() {
  let sel = byId[state.arg] ? state.arg : null, labels = S.get("labels", true), regions = S.get("regions", true), subs = S.get("subs", true), eu = false;
  const draw = () => {
    const tog = (id, on, a, b) => `<button class="btn${on ? " primary" : ""}" id="${id}">${on ? a : b}</button>`;
    V.innerHTML = `<section class="stack"><h2>Harta reliefului</h2>
      <div class="modes"><button class="${eu ? "" : "on"}" id="mRo">România</button><button class="${eu ? "on" : ""}" id="mEu">Europa</button></div>
      ${eu ? `<p class="lead">România în Europa: între Carpați, Dunăre și Marea Neagră, în sud-estul continentului. Harta e aici pentru lecțiile despre Europa, când apar în caiet.</p>
        <figure class="foto map-eu"><img src="${G.europa.imagine}" alt="Harta de relief a Europei"><figcaption>Harta de relief a Europei<span>${credit(G.surseHarti[1])}</span></figcaption></figure>`
      : `<p class="lead">Harta reală de relief a României. Zonele colorate arată aproximativ unde e fiecare unitate. Apasă pe o zonă ca să vezi fișa ei sau ascunde zonele ca să vezi doar relieful.</p>
      <div class="row"><div class="legend">${Object.keys(COL).map(k => `<span><i class="dot" style="background:${COL[k]}"></i>${TIPN[k]}</span>`).join("")}</div>
      <div class="chips">${tog("regBtn", regions, "Zone: pornite", "Zone: oprite")}${tog("subBtn", subs, "Subunități: pornite", "Subunități: oprite")}${tog("lblBtn", labels, "Etichete: pornite", "Etichete: oprite")}</div></div>
      <div class="map panel" style="padding:6px">${mapSVG({ sel, labels, regions, subs, dim: !!sel })}</div>
      <p class="muted small">Harta: ${credit(G.surseHarti[0])}.</p>
      <div id="mapInfo">${sel ? mini(byId[sel]) : `<p class="muted">Apasă pe hartă pe o unitate de relief.</p>`}</div>`}</section>`;
    V.querySelector("#mRo").onclick = () => { eu = false; draw(); };
    V.querySelector("#mEu").onclick = () => { eu = true; draw(); };
    if (eu) return;
    V.querySelector("#lblBtn").onclick = () => { labels = !labels; S.set("labels", labels); draw(); };
    V.querySelector("#regBtn").onclick = () => { regions = !regions; S.set("regions", regions); draw(); };
    V.querySelector("#subBtn").onclick = () => { subs = !subs; S.set("subs", subs); draw(); };
    bindMap(id => { sel = id; draw(); V.querySelector("#mapInfo").scrollIntoView({ block: "nearest" }); });
  };
  draw();
}

/* ---------------- LECȚII ---------------- */
const urow = u => `<div class="urow" style="--c:${COL[u.tip]}" data-go="unitate" data-arg="${u.id}" tabindex="0" role="button">
  <div class="grow"><b>${esc(u.nume)}</b><span class="alt">${esc(u.alt)}</span></div>
  <div class="thumbs">${(u.tags || []).filter(t => tipById[t].cat === "relief").slice(0, 4).map(t => ill(t)).join("")}</div>
  ${u.incomplet ? '<span class="badge">urmează</span>' : learned[u.id] ? '<span class="badge ok">învățat</span>' : ""}</div>`;
function lectii() {
  V.innerHTML = `<section class="stack"><h2>Lecții</h2><p class="lead">În ordinea din caiet. Deschide o unitate, răspunde la cele 4 întrebări, apoi bifează „Am învățat”.</p></section>` +
    CAP.map(c => {
      const us = U.filter(u => u.capitol === c.id), groups = [...new Set(us.map(u => u.grupa))];
      return `<section class="stack" id="cap-${c.id}"><div class="unit-head" style="--c:${COL[c.tip]}"><h2>${esc(c.nume)}</h2><p class="muted">${esc(c.intro)}</p></div>
        ${groups.map(g => (g !== c.nume ? `<span class="label">${esc(g)}</span>` : "") + us.filter(u => u.grupa === g).map(urow).join("")).join("")}</section>`;
    }).join("");
  if (state.arg) { const el = document.getElementById("cap-" + state.arg); if (el) el.scrollIntoView(); }
}

/* ---------------- FIȘA UNEI UNITĂȚI ---------------- */
const unitOptions = (exclude, selId) => full.filter(x => x.id !== exclude).map(x => `<option value="${x.id}"${x.id === selId ? " selected" : ""}>${esc(x.nume)}</option>`).join("");
const tipCard = id => { const t = tipById[id]; return t ? `<div class="panel tipcard">${ill(id)}<h3>${esc(t.nume)}</h3><p class="small">${esc(t.def)}</p></div>` : ""; };
function unitate() {
  const u = byId[state.arg]; if (!u) { go("lectii"); return; }
  const i = U.indexOf(u), prev = U[i - 1], next = U[i + 1];
  const q = (t, v) => `<div class="panel"><span class="label">${t}</span><p>${esc(v)}</p></div>`;
  const vf = (u.varfuri || []).filter(v => /^Vf/.test(v.n)).map(v => v.n).join(", ");
  V.innerHTML = `<section class="stack">
    <div class="row"><button class="btn" data-go="lectii" data-arg="${u.capitol}">← ${esc(capById[u.capitol].nume)}</button><span class="label">${esc(u.grupa)}</span></div>
    <div class="unit-head" style="--c:${COL[u.tip]}"><h1>${esc(u.nume)}</h1><span class="alt">${esc(u.alt)}${vf ? " · " + esc(vf) : ""}</span></div></section>
  ${u.incomplet ? `<div class="note"><b>Urmează informații.</b><p>În caiet ai deocamdată doar subdiviziunile. Când apare lecția, se completează fișa.</p></div>`
    : `<section class="q4" style="--c:${COL[u.tip]}">${q("1 · Formare", u.formare)}${q("2 · Roci", u.roci)}${q("3 · Altitudine", u.alt)}${q("4 · Tipuri de relief", u.relief)}</section>`}
  ${u.retine && u.retine.length ? `<section class="note"><h3>De reținut</h3><ul class="list">${u.retine.map(r => `<li>${esc(r)}</li>`).join("")}</ul></section>` : ""}
  ${u.subunitati ? `<section class="stack"><h3>Subunități</h3><div class="chips">${u.subunitati.map(s => `<span class="chip">${esc(s)}</span>`).join("")}</div></section>` : ""}
  ${G.poze.some(p => p.unitate === u.id) ? `<section class="stack"><h3>Fotografii</h3><div class="grid">${G.poze.filter(p => p.unitate === u.id).map(fig).join("")}</div></section>` : ""}
  ${u.tags && u.tags.length ? `<section class="stack"><h3>Cum arată (desene)</h3><div class="grid">${u.tags.map(tipCard).join("")}</div></section>` : ""}
  <section class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">
    <div class="map panel" style="padding:6px">${mapSVG({ sel: u.id, labels: false, dim: true })}</div>
    <div class="panel"><h3>Compară cu altă unitate</h3>
      <select id="cmpSel" aria-label="Alege unitatea de comparat">${unitOptions(u.id)}</select>
      <button class="btn" id="cmpGo">Vezi asemănări și deosebiri</button>
      ${u.incomplet ? "" : `<button class="check ${learned[u.id] ? "on" : ""}" id="learnBtn">${learned[u.id] ? "✓ Am învățat" : "Marchează: am învățat"}</button>`}
    </div></section>
  <div class="row">${prev ? `<button class="btn" data-go="unitate" data-arg="${prev.id}">← ${esc(prev.scurt)}</button>` : "<span></span>"}${next ? `<button class="btn" data-go="unitate" data-arg="${next.id}">${esc(next.scurt)} →</button>` : ""}</div>`;
  V.querySelector("#cmpGo").onclick = () => go("comparatii", (u.incomplet ? "co-n" : u.id) + "~" + V.querySelector("#cmpSel").value);
  const lb = V.querySelector("#learnBtn");
  if (lb) lb.onclick = () => { learned[u.id] = !learned[u.id]; S.set("learned", learned); render(); };
  bindMap(id => go("unitate", id));
}

/* ---------------- TIPURI DE RELIEF ---------------- */
function relief() {
  const sec = (cat, title) => `<section class="stack"><h2>${title}</h2><div class="grid">${T.filter(t => t.cat === cat).map(t => {
    const where = full.filter(u => (u.tags || []).includes(t.id));
    const foto = G.poze.filter(p => p.tip === t.id);
    return `<div class="panel tipcard">${ill(t.id)}<h3>${esc(t.nume)}</h3><p class="small">${esc(t.def)}</p>
      ${foto.length ? `<div class="mini-fotos">${foto.map(fig).join("")}</div>` : ""}
      ${where.length ? `<span class="label">Unde apare</span><div class="chips">${where.map(u => `<button class="chip" data-go="unitate" data-arg="${u.id}">${dot(u)}${esc(u.scurt)}</button>`).join("")}</div>` : ""}</div>`;
  }).join("")}</div></section>`;
  V.innerHTML = `<section class="stack"><h2>Tipuri de relief</h2><p class="lead">Desene schematice, ca o secțiune prin teren. Sub fiecare vezi unitățile din România unde apare.</p></section>` +
    sec("relief", "Forme de relief") + sec("proces", "Cum se formează: procese și roci");
}

/* ---------------- ALTITUDINI ---------------- */
function varfuri() {
  const rows = []; U.forEach(u => (u.varfuri || []).forEach(v => rows.push({ n: v.n, m: v.m, u })));
  rows.sort((a, b) => b.m - a.m);
  const W = 720, L = 210, Rm = 60, rowH = 24, top = 30, max = 2600, H = top + rows.length * rowH + 8;
  const sx = m => L + (W - L - Rm) * m / max;
  let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Altitudinile maxime din notițe">`;
  for (let t = 0; t <= 2500; t += 500) { const x = sx(t).toFixed(1); s += `<line class="grid-l" x1="${x}" x2="${x}" y1="${top - 4}" y2="${H - 4}"/><text class="tick" x="${x}" y="${top - 10}" text-anchor="middle">${t}</text>`; }
  rows.forEach((r, i) => {
    const y = top + i * rowH;
    s += `<g class="b" data-go="unitate" data-arg="${r.u.id}"><title>${esc(r.u.nume)}</title><text x="${L - 8}" y="${y + 15}" text-anchor="end">${esc(r.n)}</text>
      <rect x="${L}" y="${y + 4}" width="${(sx(r.m) - L).toFixed(1)}" height="15" rx="3" style="fill:${COL[r.u.tip]}"/>
      <text class="val" x="${(sx(r.m) + 6).toFixed(1)}" y="${y + 15}">${r.m} m</text></g>`;
  });
  V.innerHTML = `<section class="stack"><h2>Altitudini</h2>
    <p class="lead">Altitudinea maximă a fiecărei unități, din notițe, la aceeași scară (metri). Apasă pe o bară ca să deschizi unitatea.</p>
    <div class="legend">${Object.keys(COL).filter(k => k !== "campie" && k !== "delta").map(k => `<span><i class="dot" style="background:${COL[k]}"></i>${TIPN[k]}</span>`).join("")}</div>
    <div class="panel chart">${s}</svg></div>
    <div class="note"><h3>Ce se vede</h3><ul class="list">
      <li>Toate cele 4 grupe ale Carpaților Meridionali trec de 2500 m. Niciun alt munte din țară nu ajunge acolo.</li>
      <li>Carpații Occidentali sunt cei mai joși munți (sub 1850 m), mai joși decât oricare grupă a Orientalilor.</li>
      <li>Subcarpații Getici (1218 m) sunt mai înalți decât Munții Banatului și Poiana Ruscă.</li>
      <li>Munții Măcinului (467 m) sunt cei mai vechi și cei mai erodați, de aceea sunt atât de joși.</li></ul></div></section>`;
}

/* ---------------- COMPARAȚII ---------------- */
const pairHTML = c => `<article class="panel"><h3>${esc(c.a)} <span class="muted">vs</span> ${esc(c.b)}</h3>
  <div><span class="label">Asemănări</span><ul class="list">${c.same.map(s => `<li class="ans">${esc(s)}</li>`).join("")}</ul></div>
  <div><span class="label">Deosebiri</span><div class="tbl"><table><thead><tr><th></th><th>${esc(c.a)}</th><th>${esc(c.b)}</th></tr></thead>
  <tbody>${c.diff.map(d => `<tr><td>${esc(d[0])}</td><td class="ans">${esc(d[1])}</td><td class="ans">${esc(d[2])}</td></tr>`).join("")}</tbody></table></div></div></article>`;
function cmpOut(A, B) {
  const tA = A.tags || [], tB = B.tags || [], nm = t => tipById[t].nume;
  const both = tA.filter(t => tB.includes(t)), onlyA = tA.filter(t => !tB.includes(t)), onlyB = tB.filter(t => !tA.includes(t));
  const same = both.map(t => `La ambele: ${nm(t).toLowerCase()}`);
  if (A.grupa === B.grupa) same.unshift(`Fac parte din aceeași unitate: ${A.grupa}`);
  if (A.formare === B.formare) same.unshift("Au aceeași formare");
  const diff = onlyA.map(t => `${A.scurt}: ${nm(t).toLowerCase()}`).concat(onlyB.map(t => `${B.scurt}: ${nm(t).toLowerCase()}`));
  const mA = maxAlt(A), mB = maxAlt(B);
  if (mA && mB && mA !== mB) diff.unshift(`${mA > mB ? A.scurt : B.scurt} este mai înalt (${Math.max(mA, mB)} m față de ${Math.min(mA, mB)} m)`);
  const fraza = A.formare !== B.formare
    ? `${A.nume} ${plural(A)} prin ${A.formare}, în timp ce ${B.nume} ${plural(B)} prin ${B.formare}.`
    : `${A.nume} are relief ${A.relief}, în timp ce ${B.nume} are relief ${B.relief}.`;
  const row = (l, a, b) => `<tr><td>${l}</td><td>${esc(a)}</td><td>${esc(b)}</td></tr>`;
  return `<div class="tbl"><table><thead><tr><th></th><th>${dot(A)} ${esc(A.scurt)}</th><th>${dot(B)} ${esc(B.scurt)}</th></tr></thead><tbody>
    ${row("Formare", A.formare, B.formare)}${row("Roci", A.roci, B.roci)}${row("Altitudine", A.alt, B.alt)}${row("Relief", A.relief, B.relief)}</tbody></table></div>
    <div class="grid">
      <div class="panel"><span class="label same-l">Asemănări găsite</span>${same.length ? `<ul class="list">${same.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p class="small muted">Nu au tipuri de relief comune. Caută asemănarea în tabel, la formare sau la roci.</p>`}</div>
      <div class="panel"><span class="label diff-l">Deosebiri găsite</span>${diff.length ? `<ul class="list">${diff.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : `<p class="small muted">Diferențele sunt în tabel, rând cu rând.</p>`}</div>
    </div>
    <div class="note"><span class="label">Exemplu de frază pentru examen</span><p>${esc(fraza)}</p></div>`;
}
function comparatii() {
  let [a, b] = (state.arg || "").split("~");
  if (!byId[a] || byId[a].incomplet) a = "co-n";
  if (!byId[b] || byId[b].incomplet || b === a) b = a === "cm-f" ? "co-n" : "cm-f";
  let hidden = false;
  V.innerHTML = `<section class="stack"><h2>Asemănări și deosebiri</h2>
    <p class="lead">Alege oricare două unități. Tabelul le pune față în față pe cele 4 întrebări. Tipurile de relief comune sunt asemănări, iar cele diferite sunt deosebiri.</p>
    <div class="panel"><div class="pick"><select id="sa" aria-label="Prima unitate">${unitOptions(null, a)}</select><span class="label" style="text-align:center">față de</span><select id="sb" aria-label="A doua unitate">${unitOptions(null, b)}</select></div>
    <div id="cmpOut" class="stack"></div></div></section>
    <section class="stack"><div class="row"><h2>Perechi de examen</h2><button class="btn" id="hideBtn">Ascunde răspunsurile</button></div>
    <p class="lead">Perechile care se cer cel mai des. Ascunde răspunsurile, spune-le singur, apoi apasă pe fiecare ca să verifici.</p>
    <div id="pairs" class="stack">${G.comparatii.map(pairHTML).join("")}</div></section>`;
  const sa = V.querySelector("#sa"), sb = V.querySelector("#sb"), out = V.querySelector("#cmpOut");
  const upd = () => { out.innerHTML = cmpOut(byId[sa.value], byId[sb.value]); try { history.replaceState(null, "", "#comparatii-" + sa.value + "~" + sb.value); } catch (e) {} };
  sa.onchange = sb.onchange = upd; upd();
  const pairs = V.querySelector("#pairs"), hb = V.querySelector("#hideBtn");
  hb.onclick = () => { hidden = !hidden; pairs.classList.toggle("hide-ans", hidden); pairs.querySelectorAll(".ans").forEach(e => e.classList.remove("shown")); hb.textContent = hidden ? "Arată toate răspunsurile" : "Ascunde răspunsurile"; };
  pairs.addEventListener("click", e => { const x = e.target.closest(".ans"); if (x && hidden) x.classList.add("shown"); });
}

/* ---------------- EXERSARE ---------------- */
function allCards() {
  const c = [];
  full.forEach(u => {
    const base = { t: u.tip, tag: u.nume, cap: u.capitol };
    c.push({ ...base, id: u.id + "-f", q: `Cum s-a format: ${u.nume}?`, a: u.formare });
    c.push({ ...base, id: u.id + "-r", q: `Din ce roci e alcătuit(ă): ${u.nume}?`, a: u.roci });
    c.push({ ...base, id: u.id + "-t", q: `Ce tipuri de relief are: ${u.nume}?`, a: u.relief });
    const vf = (u.varfuri || []).filter(v => /^Vf/.test(v.n)).map(v => v.n).join(", ");
    c.push({ ...base, id: u.id + "-a", q: `Ce altitudine are: ${u.nume}?`, a: u.alt + (vf ? " – " + vf : "") });
  });
  U.filter(u => u.incomplet).forEach(u => c.push({ id: u.id + "-s", t: u.tip, tag: u.nume, cap: u.capitol, q: `Ce subunități are: ${u.nume}?`, a: u.subunitati.join(", ") }));
  G.comparatii.forEach((p, i) => {
    c.push({ id: "cmp" + i + "-s", t: "deal", tag: "Comparație", cap: "cmp", q: `Spune o asemănare între ${p.a} și ${p.b}.`, a: p.same.join(" · ") });
    c.push({ id: "cmp" + i + "-d", t: "deal", tag: "Comparație", cap: "cmp", q: `Spune o deosebire între ${p.a} și ${p.b}.`, a: p.diff.map(d => `${d[0]}: ${d[1]} / ${d[2]}`).join(" · ") });
  });
  T.forEach(t => c.push({ id: "tip-" + t.id, t: "podis", tag: "Tip de relief", cap: "tip", q: `Ce înseamnă: ${t.nume}?`, a: t.def, ill: t.id }));
  return c;
}
function exersare() {
  const modes = [["harta", "Unde e pe hartă?"], ["marcat", "Ce unitate e marcată?"], ["cartonase", "Cartonașe"], ["unitate", "Ce unitate e?"],
    ["poza", "Ce arată poza?"], ["imagine", "Ce relief e în desen?"], ["inaltime", "Care e mai înalt?"]];
  const mode = modes.some(m => m[0] === state.arg) ? state.arg : "harta";
  V.innerHTML = `<section class="stack"><h2>Exersare</h2>
    <div class="modes">${modes.map(([k, n]) => `<button class="${k === mode ? "on" : ""}" data-go="exersare" data-arg="${k}">${n}</button>`).join("")}</div>
    <div id="ex" class="stack"></div></section>`;
  ({ harta: exMap, marcat: exMarked, cartonase: exCards, unitate: exUnit, poza: exPhoto, imagine: exImg, inaltime: exHigh })[mode](V.querySelector("#ex"));
}

/* Joc pe hartă: primești un nume și pui un pin pe harta reală. Puncte după distanță (0–1000). */
function exMap(el) {
  const ROUNDS = 5;
  let set = S.get("mapSet", "unitati"), round, total, results, queue, cur, guess, redo = null;
  const targets = () => set === "unitati"
    ? U.filter(u => u.eticheta).map(u => ({ k: u.id, n: u.nume, pt: u.eticheta, polys: polysOf(u), u }))
    : G.locuri.map(l => ({ k: l.id, n: l.n, pt: [l.lon, l.lat], polys: null, u: byId[l.unitate] }));
  const start = list => { round = 0; total = 0; results = []; queue = shuffle(list || targets()).slice(0, list ? list.length : ROUNDS); redo = null; ask(); };
  const pin = (pt, cls) => { const [x, y] = P(pt); return `<circle class="${cls}" cx="${x}" cy="${y}" r="7"/>`; };
  const ask = () => {
    cur = queue[round]; guess = null;
    el.innerHTML = `<div class="row"><div class="modes small-modes">
        <button class="${set === "unitati" ? "on" : ""}" id="setU">Unități de relief</button><button class="${set === "locuri" ? "on" : ""}" id="setL">Vârfuri și locuri</button></div>
        <span class="count">Runda ${round + 1} / ${queue.length} · ${total} puncte · record ${best["harta-" + set] || 0}</span></div>
      <div class="fact">Unde este: <b>${esc(cur.n)}</b>?</div>
      <div class="map panel play" style="padding:6px">${mapSVG({ regions: false, vecini: false })}</div>
      <div class="row"><span id="msg" class="muted">Apasă pe hartă unde crezi că este.</span><button class="btn primary" id="nx" hidden>${round + 1 < queue.length ? "Următoarea" : "Vezi rezultatul"}</button></div>`;
    el.querySelector("#setU").onclick = () => { set = "unitati"; S.set("mapSet", set); start(); };
    el.querySelector("#setL").onclick = () => { set = "locuri"; S.set("mapSet", set); start(); };
    const svg = el.querySelector(".play svg");
    svg.addEventListener("click", e => {
      if (guess) return;
      const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
      const q = p.matrixTransform(svg.getScreenCTM().inverse());
      guess = unP(q.x, q.y);
      const inside = (cur.polys || []).filter(pg => inPoly(guess, pg)).length % 2 === 1;
      const d = inside ? 0 : km(guess, cur.pt);
      const pts = inside ? 1000 : Math.max(0, Math.round(1000 * Math.exp(-d / 70)));
      total += pts; results.push({ t: cur, d, pts, inside });
      const [gx, gy] = P(guess), [tx, ty] = P(cur.pt);
      const shown = cur.polys ? `<path class="reg on" style="fill:${COL[cur.u.tip]};fill-rule:evenodd" d="${cur.polys.map(path).join("")}"/>` : "";
      svg.insertAdjacentHTML("beforeend", shown + `<line class="pin-line" x1="${gx}" y1="${gy}" x2="${tx}" y2="${ty}"/>` + pin(cur.pt, "pin-ok") + pin(guess, "pin-you"));
      el.querySelector("#msg").innerHTML = inside ? `<span class="same-l">Exact în zonă! 1000 de puncte.</span>`
        : `<span class="${pts >= 600 ? "same-l" : "diff-l"}">${Math.round(d)} km distanță · ${pts} puncte.</span> <span class="small">Verde = locul corect, roșu = pinul tău.</span>`;
      el.querySelector(".count").textContent = `Runda ${round + 1} / ${queue.length} · ${total} puncte · record ${best["harta-" + set] || 0}`;
      const nx = el.querySelector("#nx"); nx.hidden = false; nx.focus();
    });
    el.querySelector("#nx").onclick = () => { round++; round < queue.length ? ask() : end(); };
  };
  const end = () => {
    const max = queue.length * 1000, isFull = queue.length === ROUNDS;
    if (isFull && total > (best["harta-" + set] || 0)) { best["harta-" + set] = total; S.set("best", best); }
    const wrong = results.filter(r => r.pts < 600).map(r => r.t);
    el.innerHTML = `<div class="fact">Rezultat: <b>${total}</b> din ${max} puncte</div>
      <div class="panel tbl"><table><thead><tr><th>Ce trebuia găsit</th><th>Distanță</th><th>Puncte</th></tr></thead><tbody>
      ${results.map(r => `<tr><td>${esc(r.t.n)}</td><td>${r.inside ? "în zonă" : Math.round(r.d) + " km"}</td><td class="${r.pts >= 600 ? "same-l" : "diff-l"}">${r.pts}</td></tr>`).join("")}</tbody></table></div>
      <div class="row" style="justify-content:flex-start"><button class="btn primary" id="again">Joacă din nou</button>
      ${wrong.length ? `<button class="btn" id="redo">Repetă doar ce ai greșit (${wrong.length})</button>` : ""}</div>
      ${isFull ? "" : `<p class="muted small">Runda de repetare nu intră la record.</p>`}`;
    el.querySelector("#again").onclick = () => start();
    const r = el.querySelector("#redo"); if (r) r.onclick = () => start(wrong);
  };
  el.insertAdjacentHTML("beforebegin", `<p class="lead">Primești numele unei unități sau al unui loc. Pune pinul pe harta reală de relief, fără etichete. Dacă nimerești în zona unității primești 1000 de puncte. Altfel, cu cât ești mai aproape, cu atât primești mai multe puncte. Un joc are ${ROUNDS} runde.</p>`);
  start();
}

/* Unitatea e colorată pe hartă; alegi numele ei. */
function exMarked(el) {
  const pool = U.filter(u => u.poligoane);
  el.insertAdjacentHTML("beforebegin", `<p class="lead">O zonă e colorată pe hartă. Ce unitate de relief este?</p>`);
  quizShell(el, "marcat", (box, msg, answer) => {
    const cur = pick(pool), opts = shuffle([cur.id].concat(shuffle(pool.filter(u => u.id !== cur.id).map(u => u.id)).slice(0, 3)));
    box.innerHTML = `<div class="map panel" style="padding:6px">${mapSVG({ only: cur.id, vecini: true })}</div>`;
    optionButtons(box, opts, cur.id, id => byId[id].nume, ok => {
      msg.innerHTML = ok ? `<span class="same-l">Corect.</span>` : `<span class="diff-l">Este:</span> <button class="chip" data-go="unitate" data-arg="${cur.id}">${esc(cur.nume)}</button>`;
      answer(ok);
    });
  });
}

/* Fotografie reală: ce tip de relief sau ce unitate arată? */
function exPhoto(el) {
  const qs = [];
  G.poze.forEach(p => {
    if (p.tip && tipById[p.tip]) qs.push({ p, ask: "Ce tip de relief arată poza?", right: p.tip, pool: [...new Set(G.poze.filter(x => x.tip).map(x => x.tip))], label: id => tipById[id].nume });
    qs.push({ p, ask: "Din ce unitate de relief este?", right: p.unitate, pool: [...new Set(G.poze.map(x => x.unitate))], label: id => byId[id].nume });
  });
  el.insertAdjacentHTML("beforebegin", `<p class="lead">Fotografii reale din România. Recunoaște tipul de relief sau unitatea.</p>`);
  quizShell(el, "poza", (box, msg, answer) => {
    const q = pick(qs), opts = shuffle([q.right].concat(shuffle(q.pool.filter(x => x !== q.right)).slice(0, 3)));
    box.innerHTML = `<div class="fact">${q.ask}</div><figure class="foto quiz-photo"><img src="${q.p.f}" alt="Fotografie de ghicit"><figcaption><span>${credit(q.p)}</span></figcaption></figure>`;
    optionButtons(box, opts, q.right, q.label, ok => {
      msg.innerHTML = `<span class="${ok ? "same-l" : "diff-l"}">${ok ? "Corect." : "Răspuns: " + esc(q.label(q.right)) + "."}</span> <span class="small">${esc(q.p.titlu)}</span>`;
      answer(ok);
    });
  });
}

function exCards(el) {
  let filt = S.get("fcFilt", "toate"), cur = null, flipped = false, last = null, armReset = false;
  const filters = [["toate", "Toate cartonașele"]].concat(CAP.map(c => [c.id, c.nume]), [["cmp", "Comparații"], ["tip", "Tipuri de relief"]]);
  const deck = () => allCards().filter(c => filt === "toate" || c.cap === filt);
  const next = () => {
    const d = deck(); if (!d.length) { cur = null; return; }
    const minBox = Math.min(...d.map(c => boxes[c.id] || 1));
    let pool = d.filter(c => (boxes[c.id] || 1) <= minBox + 1 && c.id !== last); if (!pool.length) pool = d;
    cur = pick(pool); last = cur.id; flipped = false;
  };
  const draw = () => {
    const d = deck(), cnt = [0, 0, 0, 0, 0]; d.forEach(c => cnt[(boxes[c.id] || 1) - 1]++);
    el.innerHTML = `<div class="row"><select id="fcF" aria-label="Ce cartonașe exersezi">${filters.map(([k, n]) => `<option value="${k}"${k === filt ? " selected" : ""}>${esc(n)}</option>`).join("")}</select>
      <button class="btn" id="fcReset">${armReset ? "Apasă din nou ca să ștergi" : "Resetează progresul"}</button></div>
      <div class="boxes">${cnt.map((n, i) => `<div><b>${n}</b>cutia ${i + 1}</div>`).join("")}</div>
      <p class="muted small">Cutia 1 = încă nu știi, cutia 5 = știi sigur. „Știam” mută cartonașul o cutie la dreapta, „Nu știam” îl trimite în cutia 1. Primești mai des cartonașele din cutiile mici.</p>
      ${cur ? `<div class="card" id="card" tabindex="0" role="button" aria-label="Întoarce cartonașul" style="--c:${COL[cur.t]}">
        <span class="label">${esc(cur.tag)} · cutia ${boxes[cur.id] || 1}</span>
        ${cur.ill && flipped ? `<div class="quiz-ill">${ill(cur.ill)}</div>` : ""}
        <div class="q">${esc(cur.q)}</div>
        ${flipped ? `<div class="a">${esc(cur.a)}</div>` : `<span class="muted small">Spune răspunsul cu voce tare, apoi apasă ca să verifici</span>`}</div>
        <div class="row" style="justify-content:flex-end">${flipped ? `<button class="btn badb" id="bad">Nu știam</button><button class="btn good" id="good">Știam</button>` : `<button class="btn primary" id="flip">Arată răspunsul</button>`}</div>`
      : `<p class="muted">Nu există cartonașe în această categorie.</p>`}`;
    el.querySelector("#fcF").onchange = e => { filt = e.target.value; S.set("fcFilt", filt); next(); draw(); };
    el.querySelector("#fcReset").onclick = () => { if (!armReset) { armReset = true; draw(); return; } armReset = false; boxes = {}; S.set("boxes", boxes); next(); draw(); };
    if (!cur) return;
    const flip = () => { flipped = true; draw(); const g = el.querySelector("#good"); if (g) g.focus(); };
    const card = el.querySelector("#card");
    card.onclick = () => { if (!flipped) flip(); };
    card.onkeydown = e => { if ((e.key === "Enter" || e.key === " ") && !flipped) { e.preventDefault(); flip(); } };
    const f = el.querySelector("#flip"); if (f) f.onclick = flip;
    const mark = ok => { boxes[cur.id] = ok ? Math.min(5, (boxes[cur.id] || 1) + 1) : 1; S.set("boxes", boxes); next(); draw(); };
    const gb = el.querySelector("#good"), bb = el.querySelector("#bad");
    if (gb) gb.onclick = () => mark(true);
    if (bb) bb.onclick = () => mark(false);
  };
  next(); draw();
}

function quizShell(el, key, render) {
  let score = 0, tot = 0, streak = 0;
  const head = () => `Corecte ${score} / ${tot} · serie ${streak} · record ${best[key] || 0}`;
  const answer = ok => {
    tot++; if (ok) { score++; streak++; if (streak > (best[key] || 0)) { best[key] = streak; S.set("best", best); } } else streak = 0;
    el.querySelector(".count").textContent = head();
    const nx = el.querySelector("#nx"); nx.hidden = false; nx.focus();
  };
  const ask = () => {
    el.innerHTML = `<div class="row"><span class="count">${head()}</span></div><div id="qz" class="stack"></div>
      <div class="row"><span id="msg"></span><button class="btn primary" id="nx" hidden>Următoarea</button></div>`;
    el.querySelector("#nx").onclick = ask;
    render(el.querySelector("#qz"), el.querySelector("#msg"), answer);
  };
  ask();
}
function optionButtons(box, opts, correct, label, onPick) {
  box.innerHTML += `<div class="opts">${opts.map(o => `<button data-k="${o}">${esc(label(o))}</button>`).join("")}</div>`;
  let done = false;
  box.querySelectorAll(".opts button").forEach(b => b.onclick = () => {
    if (done) return; done = true;
    const ok = b.dataset.k === correct;
    b.classList.add(ok ? "right" : "wrong");
    box.querySelector(`.opts [data-k="${correct}"]`).classList.add("right");
    onPick(ok);
  });
}

function exUnit(el) {
  const facts = [];
  full.forEach(u => {
    facts.push({ id: u.id, f: "Roci: " + u.roci }, { id: u.id, f: "Relief: " + u.relief }, { id: u.id, f: "Altitudine: " + u.alt }, { id: u.id, f: "Formare: " + u.formare });
    (u.retine || []).forEach(r => facts.push({ id: u.id, f: r }));
  });
  const occ = {}; facts.forEach(x => (occ[x.f] = occ[x.f] || new Set()).add(x.id));
  el.insertAdjacentHTML("beforebegin", `<p class="lead">Primești o informație din notițe. Alege unitatea de relief la care se potrivește.</p>`);
  quizShell(el, "unitate", (box, msg, answer) => {
    const cur = pick(facts), excl = occ[cur.f];
    const opts = shuffle([cur.id].concat(shuffle(full.filter(u => !excl.has(u.id)).map(u => u.id)).slice(0, 3)));
    box.innerHTML = `<div class="fact">${esc(cur.f)}</div>`;
    optionButtons(box, opts, cur.id, id => byId[id].nume, ok => {
      msg.innerHTML = ok ? `<span class="same-l">Corect.</span>` : `<span class="diff-l">Răspuns corect:</span> <button class="chip" data-go="unitate" data-arg="${cur.id}">${esc(byId[cur.id].nume)}</button>`;
      answer(ok);
    });
  });
}

function exImg(el) {
  const ids = T.map(t => t.id).filter(id => ILL[id]);
  el.insertAdjacentHTML("beforebegin", `<p class="lead">Ce tip de relief sau proces arată desenul? Etichetele sunt ascunse până răspunzi.</p>`);
  quizShell(el, "imagine", (box, msg, answer) => {
    const cur = pick(ids), opts = shuffle([cur].concat(shuffle(ids.filter(i => i !== cur)).slice(0, 3)));
    box.innerHTML = `<div class="quiz-ill panel" style="padding:8px">${ill(cur, "notext")}</div>`;
    optionButtons(box, opts, cur, id => tipById[id].nume, ok => {
      box.querySelector(".ill").classList.remove("notext");
      msg.innerHTML = `<span class="${ok ? "same-l" : "diff-l"}">${ok ? "Corect." : "Este: " + esc(tipById[cur].nume) + "."}</span> <span class="small">${esc(tipById[cur].def)}</span>`;
      answer(ok);
    });
  });
}

function exHigh(el) {
  const peaks = []; U.forEach(u => (u.varfuri || []).forEach(v => peaks.push({ k: u.id + "|" + v.n, n: v.n, m: v.m, u })));
  const byK = {}; peaks.forEach(p => byK[p.k] = p);
  el.insertAdjacentHTML("beforebegin", `<p class="lead">Două locuri din notițe. Care are altitudinea mai mare?</p>`);
  quizShell(el, "inaltime", (box, msg, answer) => {
    let a, b; do { [a, b] = shuffle(peaks).slice(0, 2); } while (a.m === b.m);
    const win = a.m > b.m ? a : b;
    box.innerHTML = `<div class="fact">Care este mai înalt?</div>`;
    optionButtons(box, [a.k, b.k], win.k, k => `${byK[k].n} (${byK[k].u.scurt})`, ok => {
      msg.innerHTML = `<span class="${ok ? "same-l" : "diff-l"}">${ok ? "Corect." : "Greșit."}</span> ${esc(a.n)}: <b>${a.m} m</b> · ${esc(b.n)}: <b>${b.m} m</b>`;
      answer(ok);
    });
  });
}

/* ---------------- JOCURI PE HARTA OARBĂ ---------------- */
const JOCURI = [
  ["ro-mari", "România: unități de relief", "Cele 13 mari unități: Carpații, Subcarpații, dealurile, podișurile, câmpiile și Delta."],
  ["ro", "România: subunități de relief", "Toate cele 37 de subunități, ca pe harta de la examen."],
  ["ro-loc", "România: vârfuri și locuri", "Pui un pin pe harta de relief. Primești puncte după distanță."],
  ["eu", "Europa: țări", "Cele 46 de state ale Europei pe harta politică oarbă."],
  ["eu-cap", "Europa: capitale", "Apeși pe țara care are capitala cerută."]
];
const line = pts => "M" + pts.map(p => P(p).join(" ")).join("L");
const fara = s => s.replace(/\s*\(.*?\)\s*/g, " ").trim();   // numele fără paranteze, pentru modul „scrii”
function cfgRomania(nivel) {
  const M = HR.meta;
  const regs = nivel === "mari"
    ? M.mari.map(m => ({ id: m.id, n: m.n, alt: [fara(m.n)], d: HR.mari[m.id].map(path).join("") }))
    : M.sub.map(s => ({ id: s.id, n: s.n, alt: [s.scurt, fara(s.n)], d: HR.sub[s.id].map(path).join("") }));
  const vec = HR.vecini.map(v => `<path class="jh-land" d="${v.rings.map(path).join("")}"/>`).join("");
  const lbl = G.vecini.map(([n, lo, la]) => { const [x, y] = P([lo, la]); return `<text class="jh-nb" x="${x}" y="${y}" text-anchor="middle">${esc(n)}</text>`; }).join("");
  const riv = `<path class="jh-riv" d="${HR.rauri.map(line).join("")}"/>`;
  return { key: nivel === "mari" ? "ro-mari" : "ro", titlu: "Harta oarbă a reliefului României", w: MW.toFixed(1), h: MH.toFixed(1),
    fundal: vec + lbl, regiuni: regs, peste: riv + `<path class="jh-border" d="${HR.granita.map(path).join("")}"/>`,
    intreaba: r => r.n, eticheta: r => nivel === "mari" ? r.n : r.alt[0], moduri: ["click", "variante", "scrii"] };
}
function cfgEuropa(cap) {
  const E = window.HARTA_EU;
  return { key: cap ? "eu-cap" : "eu", titlu: "Harta politică oarbă a Europei", w: E.w, h: E.h, razaMic: 6,
    fundal: E.fundal.map(d => `<path class="jh-land" d="${d}"/>`).join(""),
    regiuni: E.tari.map(t => ({ id: t.id, n: t.n, cap: t.cap, d: t.d, mic: t.mic })),
    intreaba: cap ? (r => `țara cu capitala ${r.cap}`) : (r => r.n),
    eticheta: cap ? (r => `${r.cap} (${r.n})`) : (r => r.n),
    moduri: cap ? ["click", "variante"] : ["click", "variante", "scrii"] };
}
function jocuri() {
  const g = JOCURI.some(x => x[0] === state.arg) ? state.arg : null;
  V.innerHTML = `<section class="stack"><h2>Jocuri pe hartă</h2>
    <p class="lead">Hărți oarbe, fără nume scrise. Ai 3 moduri: apeși pe hartă, alegi din variante sau scrii numele. Prima încercare îți dă 100%, a doua 66%, a treia 33%. La final poți repeta doar ce ai greșit și cu ce ai confundat.</p>
    <div class="grid">${JOCURI.map(([k, n, d]) => `<div class="panel cap${k === g ? " sel" : ""}" style="--c:${k.startsWith("eu") ? "var(--h-delta)" : "var(--h-munte)"}" data-go="jocuri" data-arg="${k}" tabindex="0" role="button"><h3>${n}</h3><p class="small muted">${d}</p></div>`).join("")}</div>
    <div id="joc" class="stack">${g ? "" : `<p class="muted">Alege un joc de mai sus.</p>`}</div></section>`;
  const el = V.querySelector("#joc");
  if (g === "ro") JocHarta(el, cfgRomania("sub"));
  else if (g === "ro-mari") JocHarta(el, cfgRomania("mari"));
  else if (g === "eu") JocHarta(el, cfgEuropa(false));
  else if (g === "eu-cap") JocHarta(el, cfgEuropa(true));
  else if (g === "ro-loc") { S.set("mapSet", "locuri"); exMap(el); }
  if (g) el.scrollIntoView({ block: "start" });
}

/* ---------------- pornire ---------------- */
const R = { acasa, harta, lectii, unitate, relief, varfuri, comparatii, exersare, surse, jocuri };
document.addEventListener("click", e => { const t = e.target.closest("[data-go]"); if (t) go(t.dataset.go, t.dataset.arg); });
document.addEventListener("keydown", e => {
  if ((e.key === "Enter" || e.key === " ") && e.target.matches && e.target.matches("[data-go][tabindex]")) { e.preventDefault(); e.target.click(); }
});
const h = (location.hash || "").slice(1), cut = h.indexOf("-");
const v0 = cut < 0 ? h : h.slice(0, cut), a0 = cut < 0 ? null : h.slice(cut + 1);
state = { view: R[v0] ? v0 : "acasa", arg: R[v0] ? a0 : null };
render();
})();
