// Dashboard perbandingan Greedy vs DSATUR (tabel metrik, jadwal slot, uji asap di semua titik)
(function () {
  const D = window.TRACE_DATA;
  if (!D) return;
  const root = document.getElementById("dashboard");
  const [g, d] = D.algorithms; // urutan dari run_coloring.py: Greedy, lalu DSATUR
  const nm = {};
  D.nodes.forEach((n) => (nm[n.id] = n.label));

  const sizes = (o) => Object.entries(o).map(([k, v]) => `Slot ${+k + 1}: ${v}`).join(" · ");

  // [nama metrik, cara ambil nilai, true = makin kecil makin baik]
  const rows = [
    ["Slot setelah pewarnaan awal", (s) => s.slots_awal, true],
    ["Slot setelah asap", (s) => s.slots_event, true],
    ["Titik yang diwarnai ulang saat asap", (s) => s.recolored.length, true],
    ["Langkah (awal / total)", (s) => `${s.steps_awal} / ${s.steps_total}`, false],
    ["Waktu pewarnaan awal (ms)", (s) => s.ms_awal, true],
    ["Waktu menangani asap (ms)", (s) => s.ms_event, true],
    ["Konflik tersisa", (s) => s.conflicts, true],
    ["Titik per slot (awal)", (s) => sizes(s.sizes_awal), false],
    ["Titik per slot (setelah asap)", (s) => sizes(s.sizes_event), false],
  ];

  function metricTable() {
    const body = rows.map(([label, get, lowerBetter]) => {
      const a = get(g.summary), b = get(d.summary);
      const cmp = lowerBetter && a !== b;
      const cls = (mine, other) => (cmp && mine < other ? ' class="best"' : "");
      return `<tr><td>${label}</td><td${cls(a, b)}>${a}</td><td${cls(b, a)}>${b}</td></tr>`;
    }).join("");
    return `<div class="box"><h2>Perbandingan hasil</h2>
      <table><thead><tr><th>Metrik</th><th>${g.title}</th><th>${d.title}</th></tr></thead><tbody>${body}</tbody></table>
      <p class="muted">Sel hijau = lebih baik. Waktu adalah median dari 200 kali jalan; di graf sekecil ini selisihnya
      hanya pecahan milidetik, jadi jangan dijadikan kesimpulan utama. Pegangan utamanya jumlah slot.</p></div>`;
  }

  // jadwal akhir: slot -> daftar titik (inilah "giliran" yang dipakai di lapangan)
  function schedule(algo) {
    const last = algo.frames[algo.frames.length - 1].colors;
    const bySlot = {};
    Object.entries(last).forEach(([id, c]) => (bySlot[c] = bySlot[c] || []).push(nm[id]));
    const items = Object.keys(bySlot).sort((a, b) => a - b)
      .map((c) => `<li><strong>Slot ${+c + 1}</strong> (${bySlot[c].length} titik): ${bySlot[c].join(", ")}</li>`).join("");
    return `<div><h3>${algo.title}</h3><ol style="list-style:none;padding:0">${items}</ol></div>`;
  }
  function scheduleBox() {
    return `<div class="box"><h2>Jadwal giliran setelah asap</h2>
        <p class="muted">Titik dalam satu slot boleh membakar sate bersamaan, karena tidak ada jalan langsung di antaranya sehingga asapnya tidak menumpuk.</p>
        <div class="sched">${schedule(g)}${schedule(d)}</div></div>`;
  }

  // uji: asap dijatuhkan di SETIAP titik, supaya tidak bergantung pada 1 lokasi
  function sweepBox() {
    const win = (k1, k2) => D.sweep.filter((r) => r[k1].slots < r[k2].slots).length;
    const dw = win("dsatur", "greedy"), gw = win("greedy", "dsatur"), tie = D.sweep.length - dw - gw;
    const trs = D.sweep.map((r) => {
      const diff = r.greedy.slots !== r.dsatur.slots;
      return `<tr><td>${nm[r.node]}</td><td>${r.greedy.slots} slot (${r.greedy.recolored} ulang)</td>` +
             `<td${diff ? ' class="best"' : ""}>${r.dsatur.slots} slot (${r.dsatur.recolored} ulang)</td></tr>`;
    }).join("");
    return `<div class="box"><h2>Kalau asap muncul di titik lain (radius ${D.event.radius} m)</h2>
      <p>DSATUR lebih sedikit slot di <strong>${dw}</strong> titik, Greedy di <strong>${gw}</strong> titik,
      sama di <strong>${tie}</strong> titik dari ${D.sweep.length} titik.</p>
      <details><summary>Lihat per titik</summary>
      <table><thead><tr><th>Lokasi asap</th><th>${g.title}</th><th>${d.title}</th></tr></thead><tbody>${trs}</tbody></table></details></div>`;
  }

  root.innerHTML = metricTable() + scheduleBox() + sweepBox();
})();