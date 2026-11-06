/**
 * Banene rettet ut. Øverst pendlene, i midten faserommet (φ, p) med de samme
 * aksene som i «Pendelen i faserommet», nederst planet av vinkelvariabelen θ
 * og virkningsvariabelen I. Rutenettet er det samme i begge planene: de
 * stiplede kurvene har konstant I (de rette linjene nederst), og de tynne
 * linjene har konstant θ, med θ = 0 der pendelen passerer bunnen mot høyre.
 *
 * «Fire pendler»: fire pendler med I = 0,5, 1, 1,5 og 2 starter i bunnen
 * samtidig, på vei mot høyre. «Sky»: de samme 24 pendlene og den samme
 * flekken som i «Mange pendler i faserommet».
 *
 * Enheter m = l = g = 1, H = p²/2 − cos φ. En svingning med utslag φ₀ har
 * k = sin(φ₀/2), kvartperioden K(k), ω = π/2K og I = (8/π)(E(k) − (1 − k²)K(k)).
 * Bevegelsen regnes eksakt: θ = θ₀ + ωt, og (φ, p) fra Jacobis elliptiske
 * funksjoner, sin(φ/2) = k sn(u), p = 2k cn(u), med u = 2Kθ/π. Randa av
 * flekken lagres som (θ₀, I) og får nye punkter der naboene glir fra hverandre.
 *
 * Kontrakt: default-eksportert init(api), api =
 * { stage, controls, getSize, onResize, signal }.
 */
import {
  button, animate, svg, txt, line, circle, poly, pin,
  FIXED, MOVING, DERIVED, HINT, LABEL,
} from "./_mekanikk.js";

export default function init({ stage, controls, getSize, onResize, signal }) {
  const TS = 1.5; // simulerte tidsenheter per sekund
  const TMAX = 75;
  const PM = 2.6; // p-aksen går fra −PM til PM
  const IM = 2.7; // I-aksen går fra 0 til IM
  const ISEP = 8 / Math.PI; // virkningen på separatrisen
  const FOUR = [0.5, 1, 1.5, 2];
  const C0 = [1.1, 0]; // flekken, som i «Mange pendler i faserommet»
  const R0 = 0.42;
  const NB = 240;
  const MAXPTS = 6000;
  let mode = "four";
  let t = 0;
  let dots = []; // { k, K, w, I, th0 }
  let edge = []; // { k, K, w, I, th0 }
  let geom = { sx: 50, sy: 50 };

  // ── Elliptiske integraler og funksjoner ──
  function agmK(k) {
    let a = 1;
    let b = Math.sqrt(1 - k * k);
    for (let i = 0; i < 30 && Math.abs(a - b) > 1e-15; i++) [a, b] = [(a + b) / 2, Math.sqrt(a * b)];
    return Math.PI / (2 * a);
  }
  function ellE(k) {
    const n = 400;
    let s = 0;
    for (let i = 0; i <= n; i++) {
      const v = (i / n) * (Math.PI / 2);
      const wgt = i === 0 || i === n ? 1 : i % 2 ? 4 : 2;
      s += wgt * Math.sqrt(1 - k * k * Math.sin(v) ** 2);
    }
    return (s * (Math.PI / 2)) / (3 * n);
  }
  /** F(ψ, k) = ∫₀^ψ dv/√(1 − k² sin² v). */
  function ellF(psi, k) {
    const n = 64;
    let s = 0;
    for (let i = 0; i <= n; i++) {
      const v = (i / n) * psi;
      const wgt = i === 0 || i === n ? 1 : i % 2 ? 4 : 2;
      s += wgt / Math.sqrt(1 - k * k * Math.sin(v) ** 2);
    }
    return (s * psi) / (3 * n);
  }
  /** sn, cn for parameter k (Numerical Recipes' sncndn med m_c = 1 − k²). */
  function sncn(uu, k) {
    let emc = 1 - k * k;
    if (emc < 1e-14) return [Math.tanh(uu), 1 / Math.cosh(uu)];
    const em = [];
    const en = [];
    let a = 1;
    let dn = 1;
    let c = 1;
    let l = 0;
    for (let i = 0; i < 13; i++) {
      l = i;
      em[i] = a;
      en[i] = emc = Math.sqrt(emc);
      c = 0.5 * (a + emc);
      if (Math.abs(a - emc) <= 1e-10 * a) break;
      emc *= a;
      a = c;
    }
    const u = uu * c;
    let sn = Math.sin(u);
    let cn = Math.cos(u);
    if (sn) {
      a = cn / sn;
      c *= a;
      for (let ii = l; ii >= 0; ii--) {
        const b = em[ii];
        a *= c;
        c *= dn;
        dn = (en[ii] + a) / (b + a);
        a = c / b;
      }
      a = 1 / Math.sqrt(c * c + 1);
      sn = sn >= 0 ? a : -a;
      cn = c * sn;
    }
    return [sn, cn];
  }

  const Iof = (k) => (8 / Math.PI) * (ellE(k) - (1 - k * k) * agmK(k));
  function kOfI(I) {
    let lo = 0;
    let hi = 0.999999;
    for (let i = 0; i < 50; i++) {
      const mid = (lo + hi) / 2;
      if (Iof(mid) < I) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  }
  function orbit(k) {
    const K = agmK(k);
    return { k, K, w: Math.PI / (2 * K), I: Iof(k) };
  }
  /** (φ, p) på banen o ved vinkelvariabelen th. */
  function state(o, th) {
    const [sn, cn] = sncn((2 * o.K * th) / Math.PI, o.k);
    return [2 * Math.asin(Math.max(-1, Math.min(1, o.k * sn))), 2 * o.k * cn];
  }
  /** Banen og vinkelvariabelen for en tilstand (φ, p) innenfor separatrisen. */
  function angleOf(phi, p) {
    const E = p * p / 2 - Math.cos(phi);
    const k = Math.sqrt(Math.max(1e-12, (E + 1) / 2));
    const o = orbit(k);
    const psi = Math.asin(Math.min(1, Math.abs(Math.sin(phi / 2)) / k));
    const F = ellF(psi, k);
    let u;
    if (phi >= 0 && p >= 0) u = F;
    else if (phi >= 0) u = 2 * o.K - F;
    else if (p < 0) u = 2 * o.K + F;
    else u = 4 * o.K - F;
    return { ...o, th0: (Math.PI * u) / (2 * o.K) };
  }

  // Rutenettet: kurver med konstant θ for I fra nesten 0 til nesten separatrisen.
  const GRID_I = [];
  for (let i = 1; i <= 36; i++) GRID_I.push((ISEP * 0.965 * i) / 36);
  const GRID_O = GRID_I.map((I) => orbit(kOfI(I)));
  const FOUR_O = FOUR.map((I) => orbit(kOfI(I)));

  function reset() {
    t = 0;
    if (mode === "four") {
      dots = FOUR_O.map((o) => ({ ...o, th0: 0 }));
      edge = [];
      return;
    }
    dots = [angleOf(C0[0], C0[1])];
    for (const [r, n] of [[0.2, 8], [0.36, 15]]) {
      for (let i = 0; i < n; i++) {
        const a = (2 * Math.PI * (i + 0.5)) / n;
        dots.push(angleOf(C0[0] + r * Math.cos(a), C0[1] + r * Math.sin(a)));
      }
    }
    edge = [];
    for (let i = 0; i < NB; i++) {
      const a = (2 * Math.PI * i) / NB;
      edge.push(angleOf(C0[0] + R0 * Math.cos(a), C0[1] + R0 * Math.sin(a)));
    }
    // θ₀ uten hopp rundt randa, så midtpunkter havner riktig.
    for (let i = 1; i < edge.length; i++) {
      while (edge[i].th0 - edge[i - 1].th0 > Math.PI) edge[i].th0 -= 2 * Math.PI;
      while (edge[i].th0 - edge[i - 1].th0 < -Math.PI) edge[i].th0 += 2 * Math.PI;
    }
  }

  /** Sett inn et punkt midt mellom naboer som ligger mer enn 3 px fra hverandre i faserommet. */
  function refine() {
    if (!edge.length || edge.length >= MAXPTS) return;
    const { sx, sy } = geom;
    const out = [];
    for (let i = 0, n = edge.length; i < n; i++) {
      const a = edge[i];
      const b = edge[(i + 1) % n];
      out.push(a);
      const [pa, qa] = state(a, a.th0 + a.w * t);
      const [pb, qb] = state(b, b.th0 + b.w * t);
      const d = Math.hypot((pb - pa) * sx, (qb - qa) * sy);
      if (d > 3 && out.length + (n - i) < MAXPTS) {
        out.push({ ...orbit((a.k + b.k) / 2), th0: (a.th0 + b.th0) / 2 });
      }
    }
    edge = out;
  }

  const buttons = [];
  for (const [m, text, aria] of [
    ["four", "Fire pendler", "Fire pendler med ulik virkningsvariabel passerer bunnen samtidig"],
    ["cloud", "Sky", "24 pendler sluppet fra en liten skive av tilstander i faserommet"],
  ]) {
    const b = button(text, aria, () => {
      mode = m;
      buttons.forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.mode === mode)));
      reset();
      loop.start();
      render();
    }, signal);
    b.dataset.mode = m;
    b.setAttribute("aria-pressed", String(m === mode));
    buttons.push(b);
    controls.append(b);
  }

  /** Tekst med senket indeks, i monospace. */
  function sub(x, yy, base, idx, { fill = LABEL, anchor = "middle" } = {}) {
    return `<text x="${x.toFixed(1)}" y="${yy.toFixed(1)}" text-anchor="${anchor}" style="fill:${fill};font-family:var(--font-mono);font-size:12px">${base}<tspan baseline-shift="sub" style="font-size:9px">${idx}</tspan></text>`;
  }

  function render() {
    const { w, h } = getSize();
    if (w < 60 || h < 60) return; // før scenen har fått mål
    const left = 26;
    const right = 12;
    const pw = w - left - right;
    const hP = Math.max(80, Math.min(110, 0.22 * h)); // pendlene
    const gap = 30;
    const avail = h - hP - 12 - gap - 34;
    const h1 = avail * 0.56; // faserommet
    const h2 = avail - h1; // (θ, I)
    const top1 = hP + 12;
    const top2 = top1 + h1 + gap;
    const sx = pw / (2 * Math.PI);
    const sy = h1 / (2 * PM);
    geom = { sx, sy };
    const X = (ph) => left + (ph + Math.PI) * sx;
    const Y = (p) => top1 + (PM - p) * sy;
    const U = (th) => left + (th / (2 * Math.PI)) * pw;
    const V = (I) => top2 + (1 - I / IM) * h2;
    const now = dots.map((d) => {
      const th = d.th0 + d.w * t;
      return { th, I: d.I, s: state(d, th) };
    });
    let g = "";

    // ── Pendlene ──
    const L = hP / 2 - 8;
    const gx = left + pw / 2;
    const gy = hP / 2;
    for (const { s } of now) {
      g += line(gx, gy, gx + L * Math.sin(s[0]), gy + L * Math.cos(s[0]), { color: FIXED, width: 1, opacity: 0.45 });
    }
    for (const { s } of now) {
      g += circle(gx + L * Math.sin(s[0]), gy + L * Math.cos(s[0]), mode === "four" ? 4 : 3.2, { fill: MOVING, stroke: "none", width: 0 });
    }
    g += pin(gx, gy);

    // ── Faserommet ──
    g += line(left, Y(0), left + pw, Y(0), { color: HINT, width: 1 });
    g += line(X(0), top1, X(0), top1 + h1, { color: HINT, width: 1 });
    g += txt(X(-Math.PI), top1 + h1 + 14, "−π", { anchor: "start" });
    g += txt(X(Math.PI), top1 + h1 + 14, "π", { anchor: "end" });
    g += txt(X(0) + 8, top1 + h1 + 14, "φ", { anchor: "start" });
    g += sub(X(0) - 6, top1 + 11, "p", "φ", { anchor: "end" });
    // Linjer med konstant θ.
    for (let j = 0; j < 8; j++) {
      const th = (j * Math.PI) / 4;
      const pts = [[X(0), Y(0)]].concat(GRID_O.map((o) => {
        const [ph, p] = state(o, th);
        return [X(ph), Y(p)];
      }));
      g += poly(pts, `stroke="${HINT}" stroke-width="1"`);
    }
    // Kurver med konstant I.
    for (const o of FOUR_O) {
      const pts = [];
      for (let i = 0; i <= 120; i++) {
        const [ph, p] = state(o, (2 * Math.PI * i) / 120);
        pts.push([X(ph), Y(p)]);
      }
      g += poly(pts, `stroke="${LABEL}" stroke-width="1" stroke-dasharray="4 4"`);
    }
    // Separatrisen.
    for (const sg of [1, -1]) {
      const br = [];
      for (let i = 0; i <= 160; i++) {
        const ph = -Math.PI + (2 * Math.PI * i) / 160;
        br.push([X(ph), Y(sg * 2 * Math.cos(ph / 2))]);
      }
      g += poly(br, `stroke="${DERIVED}" stroke-width="1.6"`);
    }
    // Navn på linjene θ = 0, π/2, π og 3π/2, som er halvaksene.
    g += txt(X(0) + 4, Y(0.45), "θ = 0", { anchor: "start", size: 10 });
    g += txt(X(0) + 4, Y(-0.45) + 8, "π", { anchor: "start", size: 10 });
    g += txt(X(0.55), Y(0) - 5, "π/2", { anchor: "middle", size: 10 });
    g += txt(X(-0.55), Y(0) - 5, "3π/2", { anchor: "middle", size: 10 });

    // ── Planet av θ og I ──
    g += `<clipPath id="ai-clip"><rect x="${left}" y="${top2}" width="${pw}" height="${h2}"/></clipPath>`;
    g += line(left, V(0), left + pw, V(0), { color: HINT, width: 1 });
    g += line(left, top2, left, V(0), { color: HINT, width: 1 });
    for (let j = 0; j <= 8; j++) {
      const x = U((j * Math.PI) / 4);
      g += line(x, V(GRID_I[0] * 0.5), x, V(GRID_I[GRID_I.length - 1]), { color: HINT, width: 1 });
    }
    for (const o of FOUR_O) g += line(left, V(o.I), left + pw, V(o.I), { color: LABEL, width: 1, dash: "4 4" });
    g += line(left, V(ISEP), left + pw, V(ISEP), { color: DERIVED, width: 1.6 });
    g += txt(U(0), V(0) + 14, "0", { anchor: "start" });
    g += txt(U(Math.PI), V(0) + 14, "π", { anchor: "middle" });
    g += txt(U(2 * Math.PI), V(0) + 14, "2π", { anchor: "end" });
    g += txt(U(Math.PI) + 12, V(0) + 28, "θ", { anchor: "start" });
    g += txt(left - 6, top2 + 12, "I", { anchor: "end" });

    // Flekken i begge planene.
    if (edge.length) {
      let d1 = "";
      let lx = -1e9;
      let ly = -1e9;
      const ths = [];
      for (let i = 0; i < edge.length; i++) {
        const e = edge[i];
        const th = e.th0 + e.w * t;
        ths.push(th);
        const [ph, p] = state(e, th);
        const x = X(ph);
        const yy = Y(p);
        if (i > 0 && Math.abs(x - lx) < 0.8 && Math.abs(yy - ly) < 0.8) continue;
        d1 += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${yy.toFixed(1)}`;
        lx = x;
        ly = yy;
      }
      g += `<path d="${d1}Z" style="fill:${MOVING};fill-opacity:0.25" stroke="${MOVING}" stroke-width="1" stroke-linejoin="round"/>`;
      // I (θ, I) er randa en sammenhengende kurve; den tegnes forskjøvet med hele omganger og klippes.
      const lo = Math.min(...ths);
      const hi = Math.max(...ths);
      for (let m = -Math.ceil(hi / (2 * Math.PI)); m <= Math.ceil(-lo / (2 * Math.PI)) + 1; m++) {
        let d2 = "";
        for (let i = 0; i < edge.length; i++) {
          d2 += `${i === 0 ? "M" : "L"}${U(ths[i] + 2 * Math.PI * m).toFixed(1)} ${V(edge[i].I).toFixed(1)}`;
        }
        g += `<path d="${d2}Z" clip-path="url(#ai-clip)" style="fill:${MOVING};fill-opacity:0.25" stroke="${MOVING}" stroke-width="1" stroke-linejoin="round"/>`;
      }
    }
    for (const { th, I, s } of now) {
      const r = mode === "four" ? 4.5 : 2.6;
      g += circle(X(s[0]), Y(s[1]), r, { fill: MOVING, stroke: "none", width: 0 });
      const tw = ((th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
      g += circle(U(tw), V(I), r, { fill: MOVING, stroke: "none", width: 0 });
    }

    stage.innerHTML = svg(w, h, g);
  }

  reset();
  onResize(render);
  const loop = animate({
    stage,
    signal,
    running: () => t < TMAX,
    onFrame: (dt) => {
      t = Math.min(TMAX, t + dt * TS);
      refine();
      render();
    },
  });
  render();
}
