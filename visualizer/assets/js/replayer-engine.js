// Replayer: memutar ulang trace Greedy vs DSATUR sebagai 2 graf berdampingan.
// Data dibaca dari window.TRACE_DATA (dibuat oleh: python -m scripts.run_coloring)
(function () {
  const D = window.TRACE_DATA;
  if (!D) {
    document.body.insertAdjacentHTML(
      "afterbegin",
      '<p class="error">Data belum ada. Jalankan dulu: python -m scripts.run_coloring</p>'
    );
    return;
  }

  const NS = "http://www.w3.org/2000/svg";
  const $ = (id) => document.getElementById(id);

  // Warna slot (aman untuk buta warna) + warna angka di dalam titik
  const SLOT = [
    { bg: "#56B4E9", fg: "#0b1f2e" },
    { bg: "#E69F00", fg: "#2b1c00" },
    { bg: "#009E73", fg: "#ffffff" },
    { bg: "#CC79A7", fg: "#2e0f20" },
    { bg: "#0072B2", fg: "#ffffff" },
    { bg: "#D55E00", fg: "#ffffff" },
  ];
  // Posisi label tiap titik: t=atas, b=bawah, l=kiri, r=kanan (default: bawah)
  const SIDE = { 0: "t", 1: "t", 2: "t", 3: "t", 4: "t", 5: "t", 6: "r", 7: "l", 8: "l", 9: "b",
                 10: "t", 11: "l", 12: "t", 13: "l", 14: "b", 15: "b", 16: "l", 17: "l", 18: "b", 19: "b" };
  const R = 15; // jari-jari titik

  // ---------- helper ----------
  function el(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs || {}) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  const byId = {};
  D.nodes.forEach((n) => (byId[n.id] = n));
  const X = (id) => byId[id].pos[0] * 10;        // pos di YAML = pixel / 10
  const Y = (id) => 630 - byId[id].pos[1] * 10;  // y dibalik (SVG: atas = 0)

  // viewBox menyesuaikan sebaran titik + ruang untuk label
  const xs = D.nodes.map((n) => X(n.id)), ys = D.nodes.map((n) => Y(n.id));
  const minX = Math.min(...xs) - 120, minY = Math.min(...ys) - 70;
  const VIEWBOX = [minX, minY, Math.max(...xs) + 120 - minX, Math.max(...ys) + 70 - minY].join(" ");

  function wrap(text, max) {
    const lines = []; let cur = "";
    text.split(" ").forEach((w) => {
      if (cur && (cur + " " + w).length > max) { lines.push(cur); cur = w; }
      else cur = cur ? cur + " " + w : w;
    });
    if (cur) lines.push(cur);
    return lines;
  }

  // ---------- tata letak (dihitung sekali, dipakai kedua graf) ----------
  // rute 1 edge: titik awal -> belokan jalan ('via' dari YAML) -> titik akhir
  const routeOf = (e) => [
    [X(e.from), Y(e.from)],
    ...(e.via || []).map(([x, y]) => [x * 10, 630 - y * 10]),
    [X(e.to), Y(e.to)],
  ];

  // 'placed' = kotak yang sudah terpakai [x0, y0, x1, y1], supaya angka jarak tidak menimpa apa pun
  const placed = [];
  const hit = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

  // 1) label nama tiap titik
  const nodeLabel = {};
  D.nodes.forEach((n) => {
    const lines = wrap(n.label, 18), side = SIDE[n.id] || "b", x = X(n.id), y = Y(n.id);
    const w = Math.max(...lines.map((s) => s.length)) * 6.3;
    const anchor = side === "l" ? "end" : side === "r" ? "start" : "middle";
    const lx = side === "l" ? x - R - 5 : side === "r" ? x + R + 5 : x;
    const ly = side === "t" ? y - R - 8 - (lines.length - 1) * 14
             : side === "b" ? y + R + 16
             : y + 4 - (lines.length - 1) * 7;
    const x0 = side === "l" ? lx - w : side === "r" ? lx : lx - w / 2;
    nodeLabel[n.id] = { lines, anchor, lx, ly };
    placed.push([x0, ly - 11, x0 + w, ly + (lines.length - 1) * 14 + 4]);   // kotak label
    placed.push([x - R - 4, y - R - 4, x + R + 4, y + R + 4]);               // kotak titik
  });

  // 2) angka jarak: coba di tengah tiap ruas rute (dari ruas terakhir), geser sedikit ke samping kalau sudah terisi
  const edgeLabel = D.edges.map((e) => {
    const pts = routeOf(e), text = String(e.weight), w = text.length * 6 + 6, h = 12, cands = [];
    for (let i = pts.length - 2; i >= 0; i--) {
      const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
      const len = Math.hypot(bx - ax, by - ay);
      if (len < 24) continue;
      const nx = -(by - ay) / len, ny = (bx - ax) / len;
      [0.5, 0.3, 0.7].forEach((f) => [0, 14, -14].forEach((o) =>
        cands.push([ax + (bx - ax) * f + nx * o, ay + (by - ay) * f + ny * o])));
    }
    if (!cands.length) cands.push([(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2]);
    const box = ([x, y]) => [x - w / 2, y - h / 2, x + w / 2, y + h / 2];
    const [x, y] = cands.find((c) => !placed.some((b) => hit(b, box(c)))) || cands[0];
    placed.push(box([x, y]));
    return { x, y, text };
  });

  // ---------- header & legenda ----------
  $("judul").textContent = D.meta.title;
  $("deskripsi").textContent = D.meta.description;
  $("info-event").textContent =
    "⚡ Event: " + D.event.description + " (jangkauan asap " + D.event.radius + " m)";

  let maxSlot = 0;
  D.algorithms.forEach((a) => a.frames.forEach((f) =>
    Object.values(f.colors).forEach((c) => { if (c !== null && c > maxSlot) maxSlot = c; })));
  const legend = $("legend");
  for (let i = 0; i <= maxSlot; i++) {
    legend.insertAdjacentHTML("beforeend",
      `<span class="item"><span class="swatch" style="background:${SLOT[i % SLOT.length].bg}"></span>Slot ${i + 1}</span>`);
  }
  legend.insertAdjacentHTML("beforeend",
    '<span class="item"><span class="swatch" style="background:var(--card);border-style:dashed"></span>belum dapat slot</span>' +
    '<span class="item"><span class="swatch halo"></span>lokasi asap</span>' +
    '<span class="item"><span class="swatch ring"></span>dalam jangkauan asap</span>' +
    '<span class="item"><span class="swatch dash"></span>konflik baru karena asap</span>' +
    '<span class="item muted">angka di garis = jarak jalan (m)</span>');

  // ---------- bangun panel graf ----------
  const panels = D.algorithms.map((algo) => buildPanel(algo));

  function buildPanel(algo) {
    const art = document.createElement("article");
    art.className = "panel";
    art.innerHTML =
      `<div class="panel-head"><h2>${algo.title}</h2>
         <div class="badges"><span class="badge b-phase"></span><span class="badge b-slots"></span><span class="badge b-step"></span></div></div>`;
    const svg = el("svg", { viewBox: VIEWBOX, role: "img", "aria-label": "Graf " + algo.title });
    art.appendChild(svg);
    const narasi = document.createElement("p");
    narasi.className = "narasi";
    art.appendChild(narasi);
    $("panels").appendChild(art);

    // lapisan: halo asap -> garis jalan -> garis konflik -> cincin -> titik -> label
    const gHalo = el("g", {}, svg), gEdge = el("g", {}, svg), gConf = el("g", {}, svg);
    const gRing = el("g", {}, svg), gNode = el("g", {}, svg), gLabel = el("g", {}, svg);

    const halo = el("circle", { class: "halo", r: 40, display: "none" }, gHalo);

    // garis jalan mengikuti rute di peta (arahkan mouse ke garis untuk melihat nama jalan & jaraknya)
    D.edges.forEach((e) => {
      const pl = el("polyline", { class: "edge", points: routeOf(e).map((p) => p.join(",")).join(" ") }, gEdge);
      el("title", {}, pl).textContent = byId[e.from].label + " - " + byId[e.to].label + ": " + e.weight + " m";
    });
    edgeLabel.forEach((l) => {
      const t = el("text", { class: "edge-w", x: l.x, y: l.y + 3.5 }, gEdge);
      t.textContent = l.text;
    });

    const reachRings = {};
    D.nodes.forEach((n) => {
      reachRings[n.id] = el("circle", { class: "ring-reach", cx: X(n.id), cy: Y(n.id), r: R + 7, display: "none" }, gRing);
    });
    const ringCur = el("circle", { class: "ring-cur", r: R + 5, display: "none" }, gRing);

    const nodeEls = {};
    D.nodes.forEach((n) => {
      const c = el("circle", { class: "node", cx: X(n.id), cy: Y(n.id), r: R }, gNode);
      el("title", {}, c).textContent = n.label;
      const num = el("text", { class: "node-num", x: X(n.id), y: Y(n.id) }, gNode);
      nodeEls[n.id] = { c, num };

      // label nama titik (posisi sudah dihitung di atas)
      const L = nodeLabel[n.id];
      const t = el("text", { class: "node-label", x: L.lx, y: L.ly, "text-anchor": L.anchor }, gLabel);
      L.lines.forEach((ln, i) => {
        const s = el("tspan", { x: L.lx, dy: i === 0 ? 0 : 14 }, t);
        s.textContent = ln;
      });
    });

    // titik yang masuk jangkauan asap (diambil dari frame EVENT_SMOKE)
    const ev = algo.frames.find((f) => f.type === "EVENT_SMOKE");
    const reachIds = ev ? Object.keys(ev.reach).map(Number) : [];

    return { algo, art, narasi, halo, gConf, ringCur, reachRings, reachIds, nodeEls,
             bPhase: art.querySelector(".b-phase"), bSlots: art.querySelector(".b-slots"), bStep: art.querySelector(".b-step") };
  }

  // ---------- gambar 1 frame ----------
  function renderPanel(p, t) {
    const frames = p.algo.frames;
    const f = frames[Math.min(t, frames.length - 1)];
    const un = new Set(f.uncolored);

    D.nodes.forEach((n) => {
      const c = f.colors[n.id], e = p.nodeEls[n.id];
      if (c === null || c === undefined) {
        e.c.setAttribute("class", "node uncolored");
        e.c.style.fill = "var(--card)";
        e.num.textContent = un.has(n.id) ? "?" : "";
        e.num.style.fill = "var(--muted)";
      } else {
        e.c.setAttribute("class", "node");
        e.c.style.fill = SLOT[c % SLOT.length].bg;
        e.num.textContent = c + 1;
        e.num.style.fill = SLOT[c % SLOT.length].fg;
      }
    });

    // cincin titik yang sedang diproses
    if (f.current !== null && f.current !== undefined) {
      p.ringCur.setAttribute("cx", X(f.current));
      p.ringCur.setAttribute("cy", Y(f.current));
      p.ringCur.setAttribute("display", "inline");
    } else p.ringCur.setAttribute("display", "none");

    // jangkauan asap, halo, dan garis konflik baru (hanya fase event)
    const isEvent = f.phase === "event";
    p.reachIds.forEach((id) => p.reachRings[id].setAttribute("display", isEvent ? "inline" : "none"));
    if (f.smoke) {
      p.halo.setAttribute("cx", X(f.smoke.node)); p.halo.setAttribute("cy", Y(f.smoke.node));
      p.halo.setAttribute("display", "inline");
    } else p.halo.setAttribute("display", "none");
    p.gConf.innerHTML = "";
    f.conflict_edges.forEach(([u, v]) =>
      el("line", { class: "conf", x1: X(u), y1: Y(u), x2: X(v), y2: Y(v) }, p.gConf));

    // badge + narasi
    const used = new Set(Object.values(f.colors).filter((c) => c !== null)).size;
    p.bPhase.textContent = isEvent ? "Setelah asap" : "Pewarnaan awal";
    p.bPhase.className = "badge b-phase" + (isEvent ? " phase-event" : "");
    p.bSlots.textContent = "Slot dipakai: " + used;
    p.bStep.textContent = "Langkah " + f.step + "/" + frames.length;
    p.narasi.textContent = f.text;
  }

  // ---------- kontrol ----------
  const maxT = Math.max(...D.algorithms.map((a) => a.frames.length)) - 1;
  const state = { t: 0, timer: null, speed: 1 };
  $("slider").max = maxT;

  function render() {
    panels.forEach((p) => renderPanel(p, state.t));
    $("slider").value = state.t;
    $("step-info").textContent = "Langkah " + (state.t + 1) + " / " + (maxT + 1);
  }
  function setT(t) { state.t = Math.max(0, Math.min(maxT, t)); render(); }
  function stop() { clearInterval(state.timer); state.timer = null; $("btn-play").textContent = "▶ Putar"; }
  function play() {
    if (state.timer) { stop(); return; }
    if (state.t >= maxT) state.t = 0;
    $("btn-play").textContent = "⏸ Jeda";
    state.timer = setInterval(() => {
      if (state.t >= maxT) { stop(); return; }
      setT(state.t + 1);
    }, 900 / state.speed);
  }

  $("btn-awal").onclick = () => { stop(); setT(0); };
  $("btn-prev").onclick = () => { stop(); setT(state.t - 1); };
  $("btn-next").onclick = () => { stop(); setT(state.t + 1); };
  $("btn-play").onclick = play;
  $("btn-event").onclick = () => {
    stop();
    const i = D.algorithms[0].frames.findIndex((f) => f.type === "EVENT_SMOKE");
    setT(i >= 0 ? i : maxT);
  };
  $("slider").oninput = (e) => { stop(); setT(+e.target.value); };
  $("speed").onchange = (e) => { state.speed = +e.target.value; if (state.timer) { stop(); play(); } };
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
    if (e.key === "ArrowRight") { stop(); setT(state.t + 1); }
    else if (e.key === "ArrowLeft") { stop(); setT(state.t - 1); }
    else if (e.key === " ") { e.preventDefault(); play(); }
  });

  render();
})();