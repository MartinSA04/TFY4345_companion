/**
 * Snora trekkes opp. 24 like pendler henger i snorer som går opp gjennom det
 * samme hullet i taket. De har samme energi og ligger jevnt fordelt i tid
 * rundt svingningen, så i faserommet under ligger de på én kurve med konstant
 * energi, ringen. Knappene trekker snora fra l = 1 m til 0,25 m, sakte (over
 * 20 s, med samme relative fart hele veien) eller raskt (over 0,02 s), etter
 * to hele svingninger med full lengde.
 *
 * Bevegelsen følger Hamiltons ligninger med H = p²/2ml² − mgl cos φ og den
 * gitte l(t): φ̇ = p/ml², ṗ = −mgl sin φ, med p = ml²φ̇. Snora trekker langs
 * seg selv gjennom hullet, så den gir ikke noe dreiemoment om hullet, og p
 * endres bare av tyngden.
 *
 * Faserommet har φ vannrett og p loddrett. Den fylte ringen er alle
 * tilstandene på startkurven, og randa integreres punkt for punkt (med nye
 * punkter satt inn der naboer glir fra hverandre). Den oransje stiplede kurven
 * (grå) har konstant energi og går gjennom den uthevede pendelen, med lengden
 * snora har nå. Kvadratene øverst til høyre har areal i forhold til arealet ringen
 * omslutter og arealet den stiplede kurven omslutter, med det stiplede
 * prikkede kvadratene som arealet ved start.
 *
 * Enheter: m = 1 kg, g = 9,81 m/s², l i meter. Kontrakt: default-eksportert
 * init(api), api = { stage, controls, getSize, onResize, signal }.
 */
import {
  rk4, button, animate, svg, txt, line, circle, poly, nb,
  FIXED, MOVING, HINT, LABEL,
} from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const G = 9.81;
  const L0 = 1;
  const L1 = 0.25;
  const AMP0 = (6 * Math.PI) / 180;
  const N = 24; // pendler
  const NB = 360; // punkter på randa ved start, N går opp i NB
  const MAXPTS = 5000;
  const DT = 0.002;
  const PULL = { slow: 20, fast: 0.02 };
  const HOLD = { slow: 12, fast: 20 }; // sekunder etter trekket før den stopper
  const PHM = (55 * Math.PI) / 180; // φ-aksen går fra −PHM til PHM
  const PM = 0.36; // p-aksen går fra −PM til PM, i kg·m²/s
  const DEG = 180 / Math.PI;

  let mode = "idle";
  let t = 0;
  let pend = [];
  let edge = [];
  let area0 = 1;
  let wait = 4;
  let geom = { sx: 100, sy: 100 };

  const lOf = (tt) => {
    if (mode === "idle" || tt <= wait) return L0;
    const s = Math.min(1, (tt - wait) / PULL[mode]);
    return mode === "slow" ? L0 * Math.pow(L1 / L0, s) : L0 + (L1 - L0) * s;
  };
  const f = (tt, y) => {
    const l = lOf(tt);
    return [y[1] / (l * l), -G * l * Math.sin(y[0])];
  };
  const tEnd = () => (mode === "idle" ? Infinity : wait + PULL[mode] + HOLD[mode]);

  /** Startkurven: én svingning med l = L0, samplet med like tidssteg fra bunnen. */
  function reset() {
    t = 0;
    const E = G * L0 * (1 - Math.cos(AMP0));
    let y = [0, L0 * Math.sqrt(2 * E)];
    // Perioden: tida til φ igjen krysser 0 med p > 0, funnet med små steg.
    const fixed = (_, s) => [s[1] / (L0 * L0), -G * L0 * Math.sin(s[0])];
    let T = 0;
    let prev = y;
    const h = 1e-4;
    for (let i = 0; i < 1e6; i++) {
      const nx = rk4(prev, fixed, 0, h);
      T += h;
      if (i > 100 && prev[0] < 0 && nx[0] >= 0) {
        T -= h * (nx[0] / (nx[0] - prev[0]));
        break;
      }
      prev = nx;
    }
    wait = 2 * T;
    edge = [];
    const hs = T / NB / 20;
    for (let i = 0; i < NB; i++) {
      edge.push(y.slice());
      for (let j = 0; j < 20; j++) y = rk4(y, fixed, 0, hs);
    }
    pend = [];
    for (let k = 0; k < N; k++) pend.push(edge[(k * NB) / N].slice());
    area0 = area(edge);
  }

  function area(pts) {
    let s = 0;
    for (let i = 0, n = pts.length; i < n; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % n];
      s += a[0] * b[1] - b[0] * a[1];
    }
    return Math.abs(s) / 2;
  }

  /** Energien til svingningen målt fra bunnen, og utslaget, for tilstanden y ved lengden l. */
  const energy = (y, l) => (y[1] * y[1]) / (2 * l * l) + G * l * (1 - Math.cos(y[0]));
  const ampOf = (E, l) => Math.acos(Math.max(-1, 1 - E / (G * l)));

  /** Kurven med energi E ved lengden l, som en lukket ring. */
  function curve(E, l) {
    const a = ampOf(E, l);
    const M = 90;
    const top = [];
    const bot = [];
    for (let i = 0; i <= M; i++) {
      const ph = -a + (2 * a * i) / M;
      const p = l * Math.sqrt(Math.max(0, 2 * (E - G * l * (1 - Math.cos(ph)))));
      top.push([ph, p]);
      bot.push([ph, -p]);
    }
    return top.concat(bot.reverse());
  }

  function step(dt) {
    let s = dt;
    const end = tEnd();
    while (s > 1e-9 && t < end) {
      const h = Math.min(DT, s, end - t);
      for (let i = 0; i < edge.length; i++) edge[i] = rk4(edge[i], f, t, h);
      for (let i = 0; i < N; i++) pend[i] = rk4(pend[i], f, t, h);
      t += h;
      s -= h;
    }
    refine();
  }

  /** Sett inn et punkt midt mellom naboer som ligger mer enn 3 px fra hverandre. */
  function refine() {
    if (edge.length >= MAXPTS) return;
    const { sx, sy } = geom;
    const out = [];
    for (let i = 0, n = edge.length; i < n; i++) {
      const a = edge[i];
      const b = edge[(i + 1) % n];
      out.push(a);
      const d = Math.hypot((b[0] - a[0]) * sx, (b[1] - a[1]) * sy);
      if (d > 3 && out.length + (n - i) < MAXPTS) out.push([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
    }
    edge = out;
  }

  const buttons = [];
  const go = (m) => {
    mode = m;
    buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === m)));
    reset();
    loop.start();
    render();
  };
  for (const [m, text, aria] of [
    ["slow", "Trekk sakte", "Trekk snora opp til en firedel av lengden i løpet av 20 sekunder"],
    ["fast", "Trekk raskt", "Trekk snora opp til en firedel av lengden i løpet av to hundredeler av et sekund"],
  ]) {
    const b = button(text, aria, () => go(m), signal);
    b.dataset.mode = m;
    b.setAttribute("aria-pressed", "false");
    buttons.push(b);
    controls.append(b);
  }

  /** Tekst med senket indeks, i monospace. */
  function sub(x, yy, base, idx, { fill = LABEL, anchor = "middle" } = {}) {
    return `<text x="${x.toFixed(1)}" y="${yy.toFixed(1)}" text-anchor="${anchor}" style="fill:${fill};font-family:var(--font-mono);font-size:12px">${base}<tspan baseline-shift="sub" style="font-size:9px">${idx}</tspan></text>`;
  }

  const sq = (x1, y1, side, style) =>
    `<rect x="${(x1 - side).toFixed(1)}" y="${(y1 - side).toFixed(1)}" width="${side.toFixed(1)}" height="${side.toFixed(1)}" ${style}/>`;

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    const l = lOf(t);
    const hi = pend[0];
    const Eh = energy(hi, l);
    const amp = ampOf(Eh, l);

    // ── Pendlene ──
    const hP = Math.max(120, Math.min(175, 0.4 * h));
    const cy = 22; // taket
    const S = hP - cy - 12; // piksler per meter
    const cx = Math.min(w * 0.36, w / 2 - 40);
    let g = "";
    g += line(4, cy, cx - 5, cy, { width: 2 }) + line(cx + 5, cy, w * 0.62, cy, { width: 2 });
    for (let u = 10; u <= w * 0.62; u += 8) {
      if (Math.abs(u - cx) > 7) g += line(u, cy, u - 5, cy - 6, { width: 1 });
    }
    g += line(cx, 0, cx, cy, { color: FIXED, width: 1.4 });
    const L = l * S;
    // Vendepunktene til den uthevede pendelen.
    if (amp > 0.01) {
      for (const sg of [-1, 1]) {
        g += line(cx, cy, cx + L * Math.sin(sg * amp), cy + L * Math.cos(amp), { color: LABEL, width: 1.1, dash: "4 3" });
      }
      g += txt(cx + L * Math.sin(amp) + 8, cy + L * Math.cos(amp) + 4, `${Math.round(amp * DEG)}°`);
    }
    for (let k = 1; k < N; k++) {
      const [ph] = pend[k];
      g += line(cx, cy, cx + L * Math.sin(ph), cy + L * Math.cos(ph), { color: FIXED, width: 1, opacity: 0.35 });
      g += circle(cx + L * Math.sin(ph), cy + L * Math.cos(ph), 2.6, { fill: MOVING, stroke: "none", width: 0, opacity: 0.55 });
    }
    g += line(cx, cy, cx + L * Math.sin(hi[0]), cy + L * Math.cos(hi[0]), { color: FIXED, width: 1.6 });
    g += circle(cx + L * Math.sin(hi[0]), cy + L * Math.cos(hi[0]), 5.5, { fill: MOVING, stroke: "var(--bg)", width: 1.5 });
    g += txt(4, 13, `l = ${nb(l, 2)} m`, { anchor: "start" });

    // Arealene: ringen og kurven gjennom den uthevede pendelen.
    const aRing = area(edge);
    const aCurve = area(curve(Eh, l));
    const k0 = Math.min(26, (hP - 34) / 2.9) / Math.sqrt(area0);
    const xr = w - 8;
    const yb = hP - 14;
    const sRing = k0 * Math.sqrt(aRing);
    const sCurve = k0 * Math.sqrt(aCurve);
    const s0 = k0 * Math.sqrt(area0);
    const xc = xr - Math.max(sRing, s0) - 14;
    g += sq(xr, yb, sRing, `style="fill:${MOVING};fill-opacity:0.25" stroke="${MOVING}" stroke-width="1"`);
    g += sq(xr, yb, s0, `style="fill:none" stroke="${LABEL}" stroke-width="1" stroke-dasharray="1.5 2.5"`);
    g += sq(xc, yb, sCurve, `style="fill:${LABEL};fill-opacity:0.18" stroke="${LABEL}" stroke-width="1.2" stroke-dasharray="4 3"`);
    g += sq(xc, yb, s0, `style="fill:none" stroke="${LABEL}" stroke-width="1" stroke-dasharray="1.5 2.5"`);
    g += txt(xr - Math.max(sRing, s0) / 2, yb + 12, "ring", { anchor: "middle", size: 10 });
    g += txt(xc - s0 / 2, yb + 12, "kurve", { anchor: "middle", size: 10 });
    g += txt(xr, yb - Math.max(sRing, sCurve, s0) - 6, "arealer", { anchor: "end", size: 10 });

    // ── Faserommet ──
    const left = 26;
    const right = 10;
    const top = hP + 14;
    const bottom = 34;
    const pw = w - left - right;
    const ph = h - top - bottom;
    const sx = pw / (2 * PHM);
    const sy = ph / (2 * PM);
    geom = { sx, sy };
    const X = (a) => left + (a + PHM) * sx;
    const Y = (p) => top + (PM - p) * sy;
    g += line(left, Y(0), left + pw, Y(0), { color: HINT, width: 1 });
    g += line(X(0), top, X(0), top + ph, { color: HINT, width: 1 });
    for (const d of [-45, 45]) {
      const a = d / DEG;
      g += line(X(a), Y(0) - 3, X(a), Y(0) + 3, { color: HINT, width: 1 });
      g += txt(X(a), h - 20, `${d < 0 ? "−" : ""}${Math.abs(d)}°`, { anchor: "middle" });
    }
    g += txt(X(0), h - 20, "0", { anchor: "middle" });
    g += txt(X(0), h - 4, "φ", { anchor: "middle" });
    g += sub(X(0) - 6, top - 2, "p", "φ", { anchor: "end" });

    // Ringen: randa som én lukket sti.
    let d = "";
    let lx = -1e9;
    let ly = -1e9;
    for (let i = 0; i < edge.length; i++) {
      const x = X(edge[i][0]);
      const yy = Y(edge[i][1]);
      if (i > 0 && Math.abs(x - lx) < 0.8 && Math.abs(yy - ly) < 0.8) continue;
      d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${yy.toFixed(1)}`;
      lx = x;
      ly = yy;
    }
    g += `<path d="${d}Z" style="fill:${MOVING};fill-opacity:0.2" stroke="${MOVING}" stroke-width="1" stroke-linejoin="round"/>`;
    g += poly(curve(Eh, l).map(([a, p]) => [X(a), Y(p)]).concat([[X(-amp), Y(0)]]), `stroke="${LABEL}" stroke-width="1.6" stroke-dasharray="5 4"`);
    for (let k = 1; k < N; k++) g += circle(X(pend[k][0]), Y(pend[k][1]), 2.6, { fill: MOVING, stroke: "none", width: 0 });
    g += circle(X(hi[0]), Y(hi[1]), 5, { fill: MOVING, stroke: "var(--bg)", width: 1.5 });

    stage.innerHTML = svg(w, h, g);
  }

  reset();
  onResize(render);
  const loop = animate({
    stage,
    signal,
    running: () => t < tEnd(),
    onFrame: (dt) => {
      step(dt);
      render();
    },
  });
  render();
}
