/**
 * To pendler og en fjær: to like pendler, 1,0 m lange med 1,0 kg i enden,
 * henger fra samme list, og en myk fjær forbinder loddene. Under hvert lodd
 * går en papirstrimmel nedover, og loddet tegner utslaget x sitt på den, så
 * strimmelen viser x(t) med den nyeste tida øverst. Strekene mellom
 * strimlene merker hvert tiende sekund siden start.
 *
 * Modellen er den lineariserte, mẍ₁ = −(mg/l)x₁ + k(x₂ − x₁) og tilsvarende
 * for x₂, løst eksakt i modekoordinatene (x₁ ± x₂)/2, så modene er rene.
 * Knappene starter fra ro med de tre startutslagene teksten bruker, og et
 * lodd kan dras til et nytt startutslag. Tida går i virkelig tempo.
 * Kontrakt: default-eksportert init(api), api = { stage, controls, getSize,
 * onResize, signal }.
 */
import {
  nb, slider, button, animate, svg, txt, line, poly, support, bob, FIXED, HINT, LABEL, MOVING,
} from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const G = 9.81;
  const L = 1.0; // m
  const M = 1.0; // kg
  const A = 0.2; // m, startutslaget
  const XMAX = 0.32; // m, største utslag et lodd kan dras til
  const KEEP = 40; // s historikk
  let k = 1.0;

  // Modekoordinatene s = (x₁ + x₂)/2 og d = (x₁ − x₂)/2 med fartene sine.
  let s = 0;
  let sv = 0;
  let d = 0;
  let dv = 0;
  let t = 0;
  let hist = [];
  let drag = -1; // indeksen til loddet som dras, −1 for ingen

  const w1 = () => Math.sqrt(G / L);
  const w2 = () => Math.sqrt(G / L + (2 * k) / M);
  const x1 = () => s + d;
  const x2 = () => s - d;

  function start(a, b) {
    s = (a + b) / 2;
    d = (a - b) / 2;
    sv = 0;
    dv = 0;
    t = 0;
    hist = [[0, a, b]];
  }
  start(A, 0);

  // Én mode framover dt eksakt: (q, q̇/ω) roteres vinkelen ωdt.
  function advance(q, v, w, dt) {
    const c = Math.cos(w * dt);
    const sn = Math.sin(w * dt);
    return [q * c + (v / w) * sn, -q * w * sn + v * c];
  }

  function step(dt) {
    if (drag >= 0) return;
    [s, sv] = advance(s, sv, w1(), dt);
    [d, dv] = advance(d, dv, w2(), dt);
    t += dt;
    hist.push([t, x1(), x2()]);
    while (hist.length > 2 && hist[0][0] < t - KEEP) hist.shift();
  }

  let geo = null;

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return;
    const top = 16;
    const len = Math.min(170, h * 0.4);
    const sep = Math.min(0.46 * w, 190);
    const pA = w / 2 - sep / 2;
    const pB = w / 2 + sep / 2;
    const sc = len / L; // px per m vannrett, så x på strimmelen står rett under loddet
    const by = (x) => top + Math.sqrt(Math.max(0, L * L - x * x)) * sc;
    const ax = pA + x1() * sc;
    const ay = by(x1());
    const bx = pB + x2() * sc;
    const byy = by(x2());
    geo = { pA, pB, sc, ay, byy };
    let g = "";

    // Lista og de to pendlene.
    g += line(pA - 34, top, pB + 34, top, { width: 2 });
    for (let u = pA - 30; u <= pB + 34; u += 8) g += line(u, top, u - 5, top - 6, { width: 1 });
    g += support(pA, top, 0) + support(pB, top, 0);
    g += line(pA, top, ax, ay, { color: FIXED, width: 1.6 });
    g += line(pB, top, bx, byy, { color: FIXED, width: 1.6 });
    g += txt(pA - 10 + 0.5 * (ax - pA), top + 0.5 * (ay - top), "l", { anchor: "end" });

    // Fjæra mellom loddene: like mange viklinger uansett lengde, så tettheten viser strekket.
    const R = 9;
    const dx = bx - ax;
    const dy = byy - ay;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;
    const lead = 10;
    const coil = dist - 2 * R - 2 * lead;
    const pts = [[ax + ux * R, ay + uy * R], [ax + ux * (R + lead), ay + uy * (R + lead)]];
    const n = 12;
    for (let i = 1; i < 2 * n; i++) {
      const f = R + lead + (coil * i) / (2 * n);
      const side = i % 2 ? 6 : -6;
      pts.push([ax + ux * f - uy * side, ay + uy * f + ux * side]);
    }
    pts.push([bx - ux * (R + lead), byy - uy * (R + lead)], [bx - ux * R, byy - uy * R]);
    g += poly(pts, `stroke="${LABEL}" stroke-width="1.4" stroke-linejoin="round"`);
    g += txt((ax + bx) / 2, (ay + byy) / 2 - 13, "k", { anchor: "middle" });

    // Papirstrimlene: hvilestillingen stiplet, sporet heltrukket, nyeste tid øverst.
    const sTop = Math.max(ay, byy) + R + 16;
    const sBot = h - 6;
    const pxs = Math.max(4, (sBot - sTop) / 24); // px per sekund
    const Y = (tt) => sTop + (t - tt) * pxs;
    for (const [p, i, lab, side] of [[pA, 1, "x₁", -1], [pB, 2, "x₂", 1]]) {
      g += line(p, sTop, p, sBot, { color: HINT, dash: "3 4", width: 1 });
      const tr = [];
      for (const e of hist) {
        const y = Y(e[0]);
        if (y > sBot) continue;
        tr.push([p + e[i] * sc, y]);
      }
      g += poly(tr, `stroke="${MOVING}" stroke-width="1.3" opacity="0.8" stroke-linejoin="round"`);
      // Etiketten står utenfor sporet, på den siden som vender bort fra den andre strimmelen.
      g += txt(p + side * 0.27 * sc, sTop + 12, lab, { anchor: side < 0 ? "end" : "start" });
    }
    // Hvert tiende sekund, midt mellom strimlene.
    for (let m = 10; m <= t; m += 10) {
      const y = Y(m);
      if (y > sBot - 4) continue;
      g += line(w / 2 - 12, y, w / 2 + 12, y, { color: LABEL, width: 1 });
      g += txt(w / 2, y - 4, `${m} s`, { anchor: "middle", size: 11 });
    }

    // Loddene sist, over fjæra og strengene.
    g += bob(ax, ay, R) + bob(bx, byy, R);
    stage.innerHTML = svg(w, h, g);
  }

  // Dra et lodd: utslaget følger pekeren vannrett, og slipper du, starter begge fra ro.
  function pick(e) {
    if (!geo) return -1;
    const r = stage.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    const da = Math.hypot(px - (geo.pA + x1() * geo.sc), py - geo.ay);
    const db = Math.hypot(px - (geo.pB + x2() * geo.sc), py - geo.byy);
    if (Math.min(da, db) > 28) return -1;
    return da <= db ? 0 : 1;
  }
  function moveTo(e) {
    const r = stage.getBoundingClientRect();
    const px = e.clientX - r.left;
    const p = drag === 0 ? geo.pA : geo.pB;
    const x = Math.max(-XMAX, Math.min(XMAX, (px - p) / geo.sc));
    const a = drag === 0 ? x : x1();
    const b = drag === 1 ? x : x2();
    start(a, b);
    render();
  }
  stage.style.touchAction = "pan-y";
  stage.addEventListener("pointerdown", (e) => {
    drag = pick(e);
    if (drag < 0) return;
    stage.setPointerCapture(e.pointerId);
    e.preventDefault();
    moveTo(e);
  }, { signal });
  stage.addEventListener("pointermove", (e) => {
    if (drag >= 0) moveTo(e);
  }, { signal });
  const release = () => {
    if (drag < 0) return;
    drag = -1;
    start(x1(), x2());
    loop.start();
  };
  stage.addEventListener("pointerup", release, { signal });
  stage.addEventListener("pointercancel", release, { signal });

  const preset = (a, b) => () => {
    start(a, b);
    render();
    loop.start();
  };
  controls.append(
    button("Bare venstre", "Start med bare den venstre pendelen trukket ut", preset(A, 0), signal),
    button("Samme side", "Start med begge pendlene trukket like langt til samme side", preset(A, A), signal),
    button("Hver sin side", "Start med pendlene trukket like langt til hver sin side", preset(A, -A), signal),
    slider({
      text: "Fjærkonstant k",
      aria: "Fjærkonstanten til fjæra mellom loddene, i newton per meter",
      min: 0,
      max: 5,
      step: 0.1,
      value: k,
      format: (v) => `${nb(v, 1)} N/m`,
      signal,
      onInput: (v) => {
        k = v;
        // Ny k endrer ω₂, men ikke tilstanden: fortsett fra der loddene er.
        render();
      },
    }),
  );

  const loop = animate({
    stage,
    signal,
    onFrame: (dt) => {
      step(dt);
      render();
    },
  });
  onResize(render);
  render();
}
